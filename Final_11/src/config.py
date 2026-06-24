"""
Centralized configuration for the Smart Forensic Security System.

Loads settings from three sources (in order of priority):
  1. Environment variables / ``.env`` file  (secrets & overrides)
  2. ``config.yaml``                        (tunable parameters)
  3. Hard-coded defaults below              (safe fallbacks)
"""

import os
import logging
import yaml

# -------------------------------------------------
#  Logging — project-wide setup
# -------------------------------------------------
LOG_FORMAT = "%(asctime)s │ %(levelname)-8s │ %(name)-25s │ %(message)s"
LOG_DATE   = "%Y-%m-%d %H:%M:%S"

# Console handler (always active)
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt=LOG_DATE)

# File handler (RotatingFileHandler — auto-rotates at 5 MB, keeps 3 backups)
_BASE_DIR_EARLY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_LOG_DIR = os.path.join(_BASE_DIR_EARLY, "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

from logging.handlers import RotatingFileHandler
_file_handler = RotatingFileHandler(
    os.path.join(_LOG_DIR, "system.log"),
    maxBytes=5 * 1024 * 1024,   # 5 MB per file
    backupCount=3,
    encoding="utf-8",
)
_file_handler.setLevel(logging.INFO)
_file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE))
logging.getLogger().addHandler(_file_handler)

logger = logging.getLogger("config")

# -------------------------------------------------
#  Base directory (project root)
# -------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "config.yaml")

# -------------------------------------------------
#  Load .env file (secrets — NEVER commit this file)
# -------------------------------------------------
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
        logger.info("Environment variables loaded from .env")
    else:
        logger.warning(".env file not found — relying on system environment variables")
except ImportError:
    logger.warning("python-dotenv not installed — reading environment variables directly")

# -------------------------------------------------
#  Model paths (defaults)
# -------------------------------------------------
YOLO_PERSON_PATH = os.path.join(BASE_DIR, "Trained_Models", "yolov8_run", "weights", "best.onnx")
WEAPON_PATH      = os.path.join(BASE_DIR, "Trained_Models", "Weapon", "best.onnx")
POSE_MODEL_NAME  = os.path.join(BASE_DIR, "yolov8n-pose.onnx")

# -------------------------------------------------
#  Detection thresholds
# -------------------------------------------------
PERSON_CONFIDENCE = 0.55
POSE_CONFIDENCE   = 0.55
WEAPON_CONFIDENCE = 0.25   # Low to catch small weapons

# -------------------------------------------------
#  Tracker lifecycle
# -------------------------------------------------
MAX_MISSING_FRAMES   = 8   # Delete entity after N frames without detection
MAX_PERSIST          = 6   # Keep label visible for N frames after last event
ASSOCIATION_MAX_DIST = 80  # Max pixel distance for centroid matching

# -------------------------------------------------
#  Contact detection
# -------------------------------------------------
CONTACT_KEYPOINT_CONF = 0.50
CONTACT_THR_RATIO     = 0.15   # 15 % of person width
CONTACT_THR_MIN       = 30
CONTACT_THR_MAX       = 85

# -------------------------------------------------
#  Weapon detection
# -------------------------------------------------
WEAPON_HAND_CONF          = 0.40
WEAPON_BODY_CONF          = 0.50
WEAPON_THR_RATIO          = 0.25   # 25 % of person width
WEAPON_THR_MIN            = 30
WEAPON_THR_MAX            = 90
WEAPON_THREAT_MULTIPLIER  = 1.5

# -------------------------------------------------
#  Performance
# -------------------------------------------------
FRAME_SKIP = 2   # Process every Nth frame; draw on all frames

# -------------------------------------------------
#  Temporal smoothing
# -------------------------------------------------
TEMPORAL_WINDOW    = 3   # Number of recent frames to consider
TEMPORAL_THRESHOLD = 2   # Minimum positive detections to confirm

# -------------------------------------------------
#  Contact classification velocities / durations
# -------------------------------------------------
CONTACT_MIN_BODY_VELOCITY = 5
CONTACT_MIN_HAND_VELOCITY = 8
CONTACT_ASSAULT_HAND_VEL  = 12
CONTACT_PUSH_HAND_VEL     = 10
CONTACT_HARASSMENT_DUR    = 3
CONTACT_GRABBING_DUR      = 5

# -------------------------------------------------
#  Event logging & incidents
# -------------------------------------------------
INCIDENTS_DIR = os.path.join(BASE_DIR, "incidents")
LOG_FILE      = os.path.join(BASE_DIR, "logs", "system.log")

# -------------------------------------------------
#  Parse config.yaml if it exists
# -------------------------------------------------
if os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if data:
            models = data.get("models", {})
            if "person_detector" in models:
                YOLO_PERSON_PATH = os.path.join(BASE_DIR, models["person_detector"])
            if "weapon_detector" in models:
                WEAPON_PATH = os.path.join(BASE_DIR, models["weapon_detector"])
            if "pose_estimator" in models:
                POSE_MODEL_NAME = os.path.join(BASE_DIR, models["pose_estimator"])

            thresholds = data.get("thresholds", {})
            PERSON_CONFIDENCE = thresholds.get("person_confidence", PERSON_CONFIDENCE)
            WEAPON_CONFIDENCE = thresholds.get("weapon_confidence", WEAPON_CONFIDENCE)
            POSE_CONFIDENCE   = thresholds.get("pose_confidence", POSE_CONFIDENCE)

            performance = data.get("performance", {})
            FRAME_SKIP = performance.get("frame_skip", FRAME_SKIP)

            temporal = data.get("temporal_smoothing", {})
            TEMPORAL_WINDOW    = temporal.get("window_size", TEMPORAL_WINDOW)
            TEMPORAL_THRESHOLD = temporal.get("confirm_threshold", TEMPORAL_THRESHOLD)

            cc = data.get("contact_classification", {})
            CONTACT_MIN_BODY_VELOCITY = cc.get("min_body_velocity", CONTACT_MIN_BODY_VELOCITY)
            CONTACT_MIN_HAND_VELOCITY = cc.get("min_hand_velocity", CONTACT_MIN_HAND_VELOCITY)
            CONTACT_ASSAULT_HAND_VEL  = cc.get("assault_hand_velocity", CONTACT_ASSAULT_HAND_VEL)
            CONTACT_PUSH_HAND_VEL     = cc.get("push_hand_velocity", CONTACT_PUSH_HAND_VEL)
            CONTACT_HARASSMENT_DUR    = cc.get("harassment_duration", CONTACT_HARASSMENT_DUR)
            CONTACT_GRABBING_DUR      = cc.get("grabbing_duration", CONTACT_GRABBING_DUR)

            logger.info("Settings loaded from config.yaml ✓")
    except Exception as e:
        logger.warning("Could not parse config.yaml, using defaults: %s", e)

# -------------------------------------------------
#  GPT Verification (from environment variables)
# -------------------------------------------------
OPENAI_API_KEY      = os.environ.get("OPENAI_API_KEY", "")
GPT_VERIFY_COOLDOWN = int(os.environ.get("GPT_VERIFY_COOLDOWN", "30"))

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not set — GPT verification will be disabled")

# -------------------------------------------------
#  Backend API Integration
# -------------------------------------------------
BACKEND_URL   = os.environ.get("BACKEND_URL", "")
AI_API_KEY    = os.environ.get("AI_API_KEY", "")

# NOTE: CAMERA_AI_ID is no longer needed in .env.
# The AI now fetches all cameras dynamically via GET /camera/ai at startup.
# Kept for backward compatibility only.
CAMERA_AI_ID  = os.environ.get("CAMERA_AI_ID", "")

