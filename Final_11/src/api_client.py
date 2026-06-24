"""Backend API client for the Smart Forensic Security System.

Handles all communication with the Node.js dashboard backend:
  - Sending detection alerts (with frame image + metadata)
  - Sending heartbeat pings to confirm camera is online

All functions are wrapped in try/except — a failed API call must
NEVER crash or interrupt the detection pipeline.
"""

import json
import logging

import cv2
import requests

from .config import BACKEND_URL, AI_API_KEY

logger = logging.getLogger(__name__)


def _get_headers():
    """Return common headers for all API requests."""
    return {
        "x-api-key": AI_API_KEY,
    }


def send_alert(camera_ai_id, severity_level, severity_name, frame, metadata):
    """POST a detection alert to the backend API.

    Sends the frame as a JPEG image along with type, confidence, and
    timestamp as separate form fields — matching what the backend
    controller expects (``req.body.type``, ``req.body.confidence``,
    ``req.body.timestamp``).

    Args:
        camera_ai_id: The camera AI ID from the dashboard.
        severity_level: Integer severity level (2=HARASSMENT, 3=ASSAULT, 4=WEAPON).
        severity_name: String name of the severity level.
        frame: BGR numpy array (the raw camera frame).
        metadata: Dict of incident metadata (same as metadata.json).

    Returns:
        None — logs success/failure to console only.
    """
    if not BACKEND_URL or not camera_ai_id:
        return

    try:
        # Encode frame as JPEG bytes
        success, jpeg_buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            logger.error("[API] Failed to encode frame as JPEG")
            return

        jpeg_bytes = jpeg_buffer.tobytes()

        url = f"{BACKEND_URL}/camera/ai/{camera_ai_id}/alerts"

        # --- Map severity to backend AlertType enum ---
        # Backend accepts only "weapon" or "harassment"
        if severity_name == "WEAPON":
            alert_type = "weapon"
        else:
            alert_type = "harassment"

        # --- Pick the best confidence value ---
        confidence = metadata.get("weapon_conf") or metadata.get("contact_conf") or 0.5

        files = {
            "frame": ("frame.jpg", jpeg_bytes, "image/jpeg"),
        }
        data = {
            "type": alert_type,
            "confidence": str(confidence),
            "timestamp": metadata.get("timestamp", ""),
        }

        response = requests.post(
            url,
            headers=_get_headers(),
            files=files,
            data=data,
            timeout=10,
        )

        if response.ok:
            logger.info(
                "[API] ✓ Alert sent — severity: %s (level %d) — status: %d",
                severity_name, severity_level, response.status_code,
            )
        else:
            logger.warning(
                "[API] ✗ Alert failed — status: %d — %s",
                response.status_code, response.text[:200],
            )

    except requests.exceptions.ConnectionError:
        logger.warning("[API] ✗ Alert failed — backend not reachable at %s", BACKEND_URL)
    except requests.exceptions.Timeout:
        logger.warning("[API] ✗ Alert failed — request timed out")
    except Exception as e:
        logger.warning("[API] ✗ Alert failed — unexpected error: %s", e)


def send_heartbeat(camera_ai_id):
    """POST a heartbeat ping to confirm the camera is online.

    Args:
        camera_ai_id: The camera AI ID from the dashboard.

    Returns:
        None — logs success/failure to console only.
    """
    if not BACKEND_URL or not camera_ai_id:
        return

    try:
        url = f"{BACKEND_URL}/camera/ai/{camera_ai_id}/heartbeat"

        response = requests.post(
            url,
            headers=_get_headers(),
            timeout=5,
        )

        if response.ok:
            logger.debug("[API] ♥ Heartbeat sent — status: %d", response.status_code)
        else:
            logger.warning(
                "[API] ✗ Heartbeat failed — status: %d — %s",
                response.status_code, response.text[:200],
            )

    except requests.exceptions.ConnectionError:
        logger.debug("[API] ✗ Heartbeat failed — backend not reachable")
    except requests.exceptions.Timeout:
        logger.debug("[API] ✗ Heartbeat failed — request timed out")
    except Exception as e:
        logger.warning("[API] ✗ Heartbeat failed — unexpected error: %s", e)


def fetch_cameras_for_ai():
    """GET the list of active cameras from the backend.
    
    Returns:
        A list of dictionaries representing the cameras (e.g., with 'cameraAiId' and 'rtspUrl').
        Returns an empty list if the request fails.
    """
    if not BACKEND_URL:
        logger.warning("[API] BACKEND_URL is not set. Cannot fetch cameras.")
        return []

    try:
        url = f"{BACKEND_URL}/camera/ai"
        
        response = requests.get(
            url,
            headers=_get_headers(),
            timeout=10,
        )

        if response.ok:
            # Backend should return an array of camera objects directly or wrapped in data
            data = response.json()
            cameras = data.get("data", data) if isinstance(data, dict) else data
            
            if not isinstance(cameras, list):
                logger.warning("[API] ✗ Fetch cameras failed — unexpected response format: %s", type(cameras))
                return []
                
            logger.info("[API] ✓ Fetched %d cameras from backend.", len(cameras))
            return cameras
        else:
            logger.warning(
                "[API] ✗ Fetch cameras failed — status: %d — %s",
                response.status_code, response.text[:200],
            )
            return []

    except requests.exceptions.ConnectionError:
        logger.warning("[API] ✗ Fetch cameras failed — backend not reachable at %s", BACKEND_URL)
        return []
    except requests.exceptions.Timeout:
        logger.warning("[API] ✗ Fetch cameras failed — request timed out")
        return []
    except Exception as e:
        logger.warning("[API] ✗ Fetch cameras failed — unexpected error: %s", e)
        return []

