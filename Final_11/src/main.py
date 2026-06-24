"""Smart Forensic Security System — main entry point.

This module wires all components together and runs the real-time
inference loop. It handles multiple camera streams, fetches available
cameras from the Node.js backend, and processes them concurrently using
a robust background inference pipeline.

Usage:
    python -m src.main                 # fetches cameras from backend or uses webcam if none
    python -m src.main video.mp4       # fallback local testing
"""

import cv2
import sys
import time
import logging
import numpy as np
import threading
import copy
import math
from concurrent.futures import ThreadPoolExecutor, as_completed

# ==============================================================================
# SECURITY PATCH: FIX FOR PYTORCH 2.6+ LOADING ERRORS
# ==============================================================================
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load


from .config import (
    MAX_PERSIST, FRAME_SKIP, GPT_VERIFY_COOLDOWN,
    OPENAI_API_KEY, YOLO_PERSON_PATH, WEAPON_PATH, POSE_MODEL_NAME,
    INCIDENTS_DIR, LOG_FILE, CAMERA_AI_ID,
)
from .models import PersonDetector, PoseEstimator, WeaponDetector
from .tracker import EntityTracker
from .analysis import resolve_contact, resolve_weapon, EntitySmootherSet
from .analysis.gpt_verifier import verify_with_gpt
from .visualization import Drawer
from .events import EventLogger, SeverityLevel
from .api_client import fetch_cameras_for_ai, send_heartbeat

logger = logging.getLogger(__name__)


# -------------------------------------------------
#  Startup Self-Diagnostics
# -------------------------------------------------
def _run_diagnostics():
    import os
    critical_ok = True

    logger.info("=" * 60)
    logger.info("  Smart Forensic Security System — Startup Diagnostics")
    logger.info("=" * 60)

    for label, path in [
        ("Person model ", YOLO_PERSON_PATH),
        ("Pose model   ", POSE_MODEL_NAME),
        ("Weapon model ", WEAPON_PATH),
    ]:
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            logger.info("  ✓ %s — %s (%.1f MB)", label, os.path.basename(path), size_mb)
        else:
            logger.error("  ✗ %s — NOT FOUND: %s", label, path)
            critical_ok = False

    if OPENAI_API_KEY:
        masked = OPENAI_API_KEY[:8] + "..." + OPENAI_API_KEY[-4:]
        logger.info("  ✓ OpenAI API key  — configured (%s)", masked)
    else:
        logger.warning("  ⚠ OpenAI API key  — NOT SET (GPT verification disabled)")

    os.makedirs(INCIDENTS_DIR, exist_ok=True)
    log_dir = os.path.dirname(LOG_FILE)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    logger.info("  ✓ Incidents dir   — %s", INCIDENTS_DIR)

    logger.info("=" * 60)
    return critical_ok


def _init_system():
    logger.info("Loading models …")
    person_detector = PersonDetector()
    pose_estimator  = PoseEstimator()
    weapon_detector = WeaponDetector()
    drawer          = Drawer()
    executor        = ThreadPoolExecutor(max_workers=3)
    logger.info("All models loaded ✓")
    return person_detector, pose_estimator, weapon_detector, drawer, executor


# -------------------------------------------------
#  VIDEO CAPTURE ASYNC CLASS
# -------------------------------------------------
class VideoCaptureAsync:
    def __init__(self, src):
        self.src = src
        self.cap = cv2.VideoCapture(self.src)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
        self.grabbed, self.frame = self.cap.read()
        self.started = False
        self.read_lock = threading.Lock()
        self.thread = None
        self.frame_id = 0
        self.last_read_frame_id = -1

    def isOpened(self):
        return self.cap.isOpened()

    def start(self):
        if self.started:
            return self
        self.started = True
        self.thread = threading.Thread(target=self.update, args=())
        self.thread.daemon = True
        self.thread.start()
        return self

    def update(self):
        while self.started:
            grabbed, frame = self.cap.read()
            with self.read_lock:
                self.grabbed = grabbed
                self.frame = frame
                if grabbed:
                    self.frame_id += 1
            if not grabbed:
                time.sleep(0.1)

    def read(self):
        with self.read_lock:
            frame = self.frame.copy() if self.frame is not None else None
            grabbed = self.grabbed
            current_id = self.frame_id
            
        if grabbed and current_id != self.last_read_frame_id:
            self.last_read_frame_id = current_id
            return True, frame
        elif not grabbed:
            return False, None
        else:
            return True, None

    def release(self):
        self.started = False
        if self.thread:
            self.thread.join(timeout=1.0)
        self.cap.release()

    def get(self, propId):
        return self.cap.get(propId)


# -------------------------------------------------
#  CAMERA STREAM STATE
# -------------------------------------------------
class CameraStream:
    """Holds all state for a single camera to ensure thread safety."""
    def __init__(self, source, camera_ai_id, name):
        self.source = source
        self.camera_ai_id = camera_ai_id
        self.name = name
        
        self.cap = VideoCaptureAsync(self.source)
        self.tracker = EntityTracker()
        self.event_logger = EventLogger(camera_ai_id=self.camera_ai_id)
        
        # Inference State (was global)
        self.last_weapon_boxes = []
        self.entity_smoothers = {}
        self.gpt_cooldown_counter = {}
        self.last_gpt_display = {"text": "", "classification": "", "timestamp": 0}
        
        # Keep last good frame to prevent flickering on duplicate reads
        self.last_good_frame = None
        
        # Concurrency sharing
        self.shared_data = {
            "latest_frame": None,
            "draw_entities": {},
            "draw_weapon_boxes": []
        }
        self.shared_lock = threading.Lock()
        
    def start(self):
        self.cap.start()

    def stop(self):
        self.cap.release()


# -------------------------------------------------
#  PIPELINE (runs per camera)
# -------------------------------------------------
def run_pipeline(frame, cam: CameraStream, person_detector, pose_estimator, weapon_detector, executor):
    """Run full detection → tracking → analysis on one frame for a specific camera."""
    
    # Run detectors in parallel
    futures = {
        executor.submit(person_detector.detect, frame): "persons",
        executor.submit(pose_estimator.track, frame):   "poses",
        executor.submit(weapon_detector.detect, frame): "weapons",
    }
    results = {}
    for future in as_completed(futures):
        results[futures[future]] = future.result()

    person_res = results["persons"]
    pose_res   = results["poses"]
    weapon_res = results["weapons"]

    if len(pose_res) > 0 and pose_res[0].boxes.id is not None:
        person_boxes = pose_res[0].boxes.xyxy.cpu().numpy()
        track_ids    = pose_res[0].boxes.id.cpu().numpy().astype(int)
    else:
        person_boxes = np.empty((0, 4))
        track_ids    = []

    cur_ids = cam.tracker.update(person_boxes, track_ids)
    weapon_boxes_raw = weapon_res[0].boxes if len(weapon_res) > 0 else []
    cam.last_weapon_boxes = weapon_boxes_raw

    for eid in cur_ids:
        info = cam.tracker.entities[eid]

        if eid not in cam.entity_smoothers:
            cam.entity_smoothers[eid] = EntitySmootherSet()
        sm = cam.entity_smoothers[eid]

        touching, role_har, contacts, contact_meta = resolve_contact(pose_res, info["bbox"])
        weapon_involved, role_w, w_info = resolve_weapon(
            pose_res, weapon_boxes_raw, info["bbox"], weapon_detector
        )
        is_aggressor = role_har in ("Aggressor", "Mutual (Both)") or role_w == "Armed Aggressor"

        confirmed_contact  = sm.contact.confirm(touching)
        confirmed_weapon   = sm.weapon.confirm(weapon_involved)
        confirmed_aggressor = sm.aggressor.confirm(is_aggressor)

        gpt_said_normal = (info.get("gpt_confirmed") is False)

        if not gpt_said_normal:
            info["contact_type"] = contact_meta["contact_type"]
            info["contact_conf"] = contact_meta["contact_conf"]
            info["contact_duration"] = contact_meta["contact_duration"]

            if confirmed_weapon and weapon_involved:
                info["role"] = role_w
                if w_info:
                    info["weapon_bbox"] = w_info[0][:4]
                    info["weapon_name"] = w_info[0][4]
                    info["weapon_conf"] = w_info[0][5]
                else:
                    info["weapon_bbox"] = None
                    info["weapon_name"] = None
                    info["weapon_conf"] = None
                info["persist_cnt"] = MAX_PERSIST

            elif confirmed_contact and touching:
                info["role"] = role_har
                info["contact_pts"] = contacts
                info["persist_cnt"] = MAX_PERSIST
            else:
                if info["persist_cnt"] > 0:
                    info["persist_cnt"] -= 1
                else:
                    info["role"] = "None"
                    info["contact_pts"] = []
                    info["contact_type"] = "None"
                    info["weapon_name"] = None
                    info["weapon_conf"] = None
                    info["weapon_bbox"] = None
        else:
            info["role"] = "Normal Contact" if touching else "None"
            info["contact_type"] = "normal_contact" if touching else "None"
            info["contact_pts"] = contacts if touching else []
            info["weapon_name"] = None
            info["weapon_conf"] = None
            info["weapon_bbox"] = None
            info["persist_cnt"] = 0

        is_suspicious = info["role"] not in ("None", "Normal", "Normal Contact")
        smoother_confirmed = (confirmed_weapon and weapon_involved) or (confirmed_contact and touching and is_suspicious)

        if touching or smoother_confirmed:
            eid_counter = cam.gpt_cooldown_counter.get(eid, 0)
            if eid_counter == 0:
                contact_type = contact_meta["contact_type"]
                is_real, explanation, classification = verify_with_gpt(frame, contact_type)
                logger.info("[GPT-4o] %s", explanation)
                cam.gpt_cooldown_counter[eid] = GPT_VERIFY_COOLDOWN
                info["gpt_confirmed"] = is_real
                info["gpt_text"] = explanation
                info["gpt_classification"] = classification
                
                cam.last_gpt_display["text"] = explanation
                cam.last_gpt_display["classification"] = classification
                cam.last_gpt_display["timestamp"] = time.time()

                if not is_real:
                    info["role"] = "Normal Contact" if touching else "None"
                    info["contact_type"] = "normal_contact" if touching else "None"
                    info["weapon_name"] = None
                    info["weapon_conf"] = None
                    info["weapon_bbox"] = None
                    info["persist_cnt"] = 0
            else:
                cam.gpt_cooldown_counter[eid] = eid_counter - 1

        cam.event_logger.evaluate_and_log(eid, info, frame)

    for eid in list(cam.entity_smoothers.keys()):
        if eid not in cam.tracker.entities:
            del cam.entity_smoothers[eid]
            if eid in cam.gpt_cooldown_counter:
                del cam.gpt_cooldown_counter[eid]

    cam.event_logger.flush_gathering()


def draw_frame(frame, cam: CameraStream, drawer, weapon_detector):
    """Draw cached results onto any frame for a specific camera."""
    with cam.shared_lock:
        entities = copy.deepcopy(cam.shared_data["draw_entities"])
        weapon_boxes = copy.deepcopy(cam.shared_data["draw_weapon_boxes"])
        last_gpt = copy.deepcopy(cam.last_gpt_display)
        
    drawer.draw(frame, entities, weapon_boxes, weapon_detector, last_gpt, GPT_DISPLAY_TIMEOUT)
    
    # Overlay Camera Name
    cv2.putText(frame, cam.name, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    return frame


DISPLAY_WIDTH  = 1280
DISPLAY_HEIGHT = 720
WINDOW_NAME    = "Smart Forensic Security System"
GPT_DISPLAY_TIMEOUT = 15


def _upscale_preserve_ratio(frame, target_w=DISPLAY_WIDTH, target_h=DISPLAY_HEIGHT):
    h, w = frame.shape[:2]
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
    x_offset = (target_w - new_w) // 2
    y_offset = (target_h - new_h) // 2
    canvas[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized
    return canvas


def create_grid(frames, max_width=DISPLAY_WIDTH, max_height=DISPLAY_HEIGHT):
    """Combine multiple frames into a single grid layout."""
    n = len(frames)
    if n == 0:
        return np.zeros((max_height, max_width, 3), dtype=np.uint8)
    if n == 1:
        return _upscale_preserve_ratio(frames[0], max_width, max_height)
        
    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)
    
    cell_w = max_width // cols
    cell_h = max_height // rows
    
    grid = np.zeros((max_height, max_width, 3), dtype=np.uint8)
    
    for idx, frame in enumerate(frames):
        if frame is None:
            continue
        row = idx // cols
        col = idx % cols
        
        resized = _upscale_preserve_ratio(frame, cell_w, cell_h)
        
        y1 = row * cell_h
        y2 = y1 + cell_h
        x1 = col * cell_w
        x2 = x1 + cell_w
        
        grid[y1:y2, x1:x2] = resized
        
    return grid


# -------------------------------------------------
#  MAIN LOOP
# -------------------------------------------------
def run():
    if not _run_diagnostics():
        logger.error("Critical components missing — aborting.")
        return

    person_detector, pose_estimator, weapon_detector, drawer, executor = _init_system()

    # ------------------------------------------------------------------
    #  Camera Discovery (3-tier fallback)
    #    1. Backend API  →  2. Command-line args  →  3. Webcam
    # ------------------------------------------------------------------
    cameras = []

    logger.info("Fetching available cameras from backend API...")
    api_cameras = fetch_cameras_for_ai()

    if api_cameras:
        logger.info("Backend returned %d enabled camera(s).", len(api_cameras))
        for i, c_data in enumerate(api_cameras):
            rtsp = c_data.get("rtspUrl")
            ai_id = c_data.get("cameraAiId")
            name = c_data.get("name", f"Camera {i+1}")
            if rtsp and ai_id:
                logger.info("  ✓ Adding camera: %s (%s)", name, ai_id)
                cameras.append(CameraStream(rtsp, ai_id, name))
            else:
                logger.warning("  ✗ Skipping camera (missing rtspUrl or cameraAiId): %s", c_data)

    if not cameras:
        # Backend returned nothing useful — check CLI args
        test_sources = sys.argv[1:]
        if test_sources:
            logger.info("No cameras from API. Using %d command-line source(s).", len(test_sources))
            # Use legacy CAMERA_AI_ID from .env for alerts (if set)
            fallback_ai_id = CAMERA_AI_ID or None
            for idx, src in enumerate(test_sources):
                src_val = int(src) if src.isdigit() else src
                cameras.append(CameraStream(src_val, fallback_ai_id, f"Local_{idx+1}"))
        else:
            # Last resort — open default webcam
            fallback_ai_id = CAMERA_AI_ID or None
            logger.info("No cameras from API and no CLI args. Falling back to webcam (0).")
            if fallback_ai_id:
                logger.info("  Using CAMERA_AI_ID=%s from .env for alerts.", fallback_ai_id)
            else:
                logger.warning("  ⚠ No CAMERA_AI_ID in .env — alerts will NOT be sent to backend.")
            cameras.append(CameraStream(0, fallback_ai_id, "Webcam"))

    if not cameras:
        logger.error("No valid cameras initialized. Exiting.")
        return

    logger.info("Starting %d camera stream(s)...", len(cameras))

    # Start Heartbeat Thread
    def _heartbeat_loop():
        while True:
            for cam in cameras:
                if cam.camera_ai_id:
                    send_heartbeat(cam.camera_ai_id)
            time.sleep(10)

    hb_thread = threading.Thread(target=_heartbeat_loop, daemon=True)
    hb_thread.start()

    # Start camera capture
    for cam in cameras:
        cam.start()

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, DISPLAY_WIDTH, DISPLAY_HEIGHT)

    fps_timer = time.time()
    fps_value = 0.0
    running = True

    # AI Worker Thread (processes all cameras safely)
    def ai_worker():
        while running:
            processed_any = False
            for cam in cameras:
                with cam.shared_lock:
                    ai_input_frame = cam.shared_data["latest_frame"].copy() if cam.shared_data["latest_frame"] is not None else None

                if ai_input_frame is None:
                    continue
                    
                processed_any = True
                
                # Inference
                run_pipeline(ai_input_frame, cam, person_detector, pose_estimator, weapon_detector, executor)
                
                with cam.shared_lock:
                    cam.shared_data["draw_entities"] = copy.deepcopy(cam.tracker.entities)
                    cam.shared_data["draw_weapon_boxes"] = copy.deepcopy(cam.last_weapon_boxes)
            
            if not processed_any:
                time.sleep(0.01)

    ai_thread = threading.Thread(target=ai_worker, daemon=True)
    ai_thread.start()
    
    logger.info("System ready — press 'q' to quit.")

    try:
        while running:
            frames_to_draw = []
            
            for cam in cameras:
                ret, frame = cam.cap.read()
                
                if frame is not None:
                    # Got a new frame — cache it and use it
                    cam.last_good_frame = frame
                    with cam.shared_lock:
                        cam.shared_data["latest_frame"] = frame.copy()
                    out = draw_frame(frame, cam, drawer, weapon_detector)
                    frames_to_draw.append(out)
                elif cam.last_good_frame is not None:
                    # No new frame yet — re-draw the last good one (prevents flicker)
                    out = draw_frame(cam.last_good_frame.copy(), cam, drawer, weapon_detector)
                    frames_to_draw.append(out)
                else:
                    # Never received a frame from this camera yet
                    blank = np.zeros((360, 640, 3), dtype=np.uint8)
                    cv2.putText(blank, f"Connecting: {cam.name}...", (20, 180),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
                    frames_to_draw.append(blank)

            grid_out = create_grid(frames_to_draw)

            # FPS counter
            now = time.time()
            elapsed = now - fps_timer
            if elapsed > 0:
                fps_value = 0.9 * fps_value + 0.1 * (1.0 / elapsed)
            fps_timer = now
            drawer.draw_fps(grid_out, fps_value)

            cv2.imshow(WINDOW_NAME, grid_out)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                running = False
                break
    except KeyboardInterrupt:
        logger.info("Interrupted by user.")
    finally:
        running = False
        for cam in cameras:
            cam.stop()
        cv2.destroyAllWindows()
        executor.shutdown(wait=False)
        logger.info("System shut down gracefully.")


run_webcam = run

if __name__ == "__main__":
    run()
