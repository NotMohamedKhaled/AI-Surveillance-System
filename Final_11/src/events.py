"""Event logging and severity escalation system.

Records security incidents with screenshots, timestamps, and severity
levels.  Designed to be consumed by a frontend dashboard or exported
as JSON reports.
"""

import os
import json
import time
import logging
from datetime import datetime
from enum import IntEnum

import cv2

from .config import INCIDENTS_DIR

logger = logging.getLogger(__name__)


class SeverityLevel(IntEnum):
    """Escalation levels for detected events."""
    NORMAL          = 0   # No action
    NORMAL_CONTACT  = 1   # Log only
    HARASSMENT      = 2   # Alert + log
    ASSAULT         = 3   # Urgent alert + video recording
    WEAPON          = 4   # Maximum alert + record + notify


# Map role strings to severity levels
_ROLE_SEVERITY = {
    "None":             SeverityLevel.NORMAL,
    "Normal":           SeverityLevel.NORMAL,
    "Normal Contact":   SeverityLevel.NORMAL_CONTACT,
    "Aggressor":        SeverityLevel.HARASSMENT,
    "Victim":           SeverityLevel.HARASSMENT,
    "Mutual (Both)":    SeverityLevel.ASSAULT,
    "Armed Aggressor":  SeverityLevel.WEAPON,
    "Armed Victim":     SeverityLevel.WEAPON,
}

# Map contact types to severity (overrides role when higher)
_CONTACT_SEVERITY = {
    "normal_contact":   SeverityLevel.NORMAL_CONTACT,
    "harassment":       SeverityLevel.HARASSMENT,
    "assault":          SeverityLevel.ASSAULT,
    "push":             SeverityLevel.ASSAULT,
    "grabbing":         SeverityLevel.HARASSMENT,
}

# Map GPT classification to severity (takes priority over YOLO)
_GPT_SEVERITY = {
    "NORMAL":         SeverityLevel.NORMAL,
    "HARASSMENT":     SeverityLevel.HARASSMENT,
    "ASSAULT":        SeverityLevel.ASSAULT,
    "WEAPON_ASSAULT": SeverityLevel.WEAPON,
}


class EventLogger:
    """Logs security events to disk with screenshots and metadata.

    Each incident is saved as:
      incidents/<date>/<timestamp>_<severity>_<entity_id>/
        ├── screenshot.jpg
        └── metadata.json
    """

    # Minimum severity to trigger saving to disk
    SAVE_THRESHOLD = SeverityLevel.HARASSMENT

    # Cooldown per entity (seconds) to avoid flooding
    COOLDOWN_SECONDS = 10
    
    # Global cooldown per camera (seconds) to prevent spamming the backend
    CAMERA_COOLDOWN_SECONDS = 10

    def __init__(self, camera_ai_id=None, output_dir=None):
        self.camera_ai_id = camera_ai_id
        self.output_dir = output_dir or INCIDENTS_DIR
        self._last_logged = {}  # {eid: timestamp}
        self._gathering = {}  # {eid: {"start_time": time, "max_sev": sev, "max_conf": conf, "best_frame": frame, "best_info": info}}
        self._event_count = 0
        self._last_camera_alert = 0  # Timestamp of the last alert sent for this camera
        os.makedirs(self.output_dir, exist_ok=True)

    def _get_severity(self, info):
        """Compute the severity level from entity info.

        GPT classification takes absolute priority when available.
        Falls back to YOLO-based severity only when GPT has not
        been consulted or is unavailable.
        """
        gpt_classification = info.get("gpt_classification", "")

        # GPT verdict is the final authority
        if gpt_classification and gpt_classification != "UNAVAILABLE":
            return _GPT_SEVERITY.get(gpt_classification, SeverityLevel.NORMAL)

        # Fallback: YOLO-based severity (GPT not available)
        role = info.get("role", "None")
        contact_type = info.get("contact_type", "None")

        role_sev = _ROLE_SEVERITY.get(role, SeverityLevel.NORMAL)
        contact_sev = _CONTACT_SEVERITY.get(contact_type, SeverityLevel.NORMAL)

        return max(role_sev, contact_sev)

    def evaluate_and_log(self, eid, info, frame):
        """Evaluate an entity's state and log if severity warrants it."""
        severity = self._get_severity(info)

        # --- Auto-correct role when it doesn't match severity ---
        role = info.get("role", "None")
        if severity >= SeverityLevel.HARASSMENT and role in ("Normal Contact", "None"):
            if severity >= SeverityLevel.WEAPON:
                info["role"] = "Armed Aggressor"
            else:
                info["role"] = "Aggressor"

        # --- If severity dropped below threshold, cancel any active gathering ---
        if severity < self.SAVE_THRESHOLD:
            if eid in self._gathering:
                logger.info("✓ Threat cleared (eid %d) — cancelling alert gather.", eid)
                del self._gathering[eid]
            return

        # Cooldown checks
        now = time.time()
        
        # 1. Camera-level cooldown
        if now - self._last_camera_alert < self.CAMERA_COOLDOWN_SECONDS:
            # If we are currently gathering for this entity, cancel it because the camera is on cooldown
            if eid in self._gathering:
                del self._gathering[eid]
            return
            
        # 2. Entity-level cooldown
        last = self._last_logged.get(eid, 0)
        if now - last < self.COOLDOWN_SECONDS:
            return

        # Confidence for comparing best frames
        conf = info.get("weapon_conf") or info.get("contact_conf") or 0.0

        if eid not in self._gathering:
            logger.info(f"⚠️ Threat detected (eid {eid}, severity {severity.name}). Gathering best frame for 2s...")
            self._gathering[eid] = {
                "start_time": now,
                "max_sev": severity,
                "max_conf": conf,
                "best_frame": frame.copy(),
                "best_info": dict(info)
            }
        else:
            state = self._gathering[eid]
            if severity > state["max_sev"] or (severity == state["max_sev"] and conf > state["max_conf"]):
                state["max_sev"] = severity
                state["max_conf"] = conf
                state["best_frame"] = frame.copy()
                state["best_info"] = dict(info)
                logger.info(f"📈 Threat (eid {eid}) conf increased to: {conf:.2f}")

    def cancel_gathering(self, eid):
        """Cancel any active gathering for an entity (e.g. when it leaves the frame)."""
        if eid in self._gathering:
            logger.info("✓ Entity %d left frame — cancelling alert gather.", eid)
            del self._gathering[eid]

    def flush_gathering(self):
        """Check all gathering states and log/alert if 2 seconds have passed."""
        now = time.time()
        for eid in list(self._gathering.keys()):
            state = self._gathering[eid]
            if now - state["start_time"] >= 2.0:
                # Final validation: only send if severity is still high enough
                final_sev = state["max_sev"]
                if final_sev >= self.SAVE_THRESHOLD:
                    self._do_log_and_alert(eid, final_sev, state["best_info"], state["best_frame"])
                    self._last_logged[eid] = now
                    self._last_camera_alert = now
                else:
                    logger.info("✓ Gathering for eid %d expired but severity dropped — skipping.", eid)
                del self._gathering[eid]

    def _do_log_and_alert(self, eid, severity, info, frame):
        self._event_count += 1

        # Build incident record
        ts = datetime.now()
        date_dir = ts.strftime("%Y-%m-%d")
        incident_name = f"{ts.strftime('%H%M%S')}_{severity.name}_entity{eid}"
        incident_dir = os.path.join(self.output_dir, date_dir, incident_name)
        os.makedirs(incident_dir, exist_ok=True)

        # Save annotated screenshot
        screenshot_path = os.path.join(incident_dir, "screenshot.jpg")
        annotated = self._annotate_screenshot(
            frame.copy(), eid, info, severity, ts
        )
        cv2.imwrite(screenshot_path, annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])

        # Save metadata
        metadata = {
            "timestamp": ts.isoformat(),
            "entity_id": eid,
            "severity": severity.name,
            "severity_level": int(severity),
            "role": info.get("role", "None"),
            "contact_type": info.get("contact_type", "None"),
            "contact_conf": info.get("contact_conf", 0.0),
            "contact_duration": info.get("contact_duration", 0),
            "weapon_name": info.get("weapon_name"),
            "weapon_conf": info.get("weapon_conf"),
            "gpt_classification": info.get("gpt_classification", ""),
            "gpt_text": info.get("gpt_text", ""),
            "bbox": [float(x) for x in info.get("bbox", [])],
        }
        meta_path = os.path.join(incident_dir, "metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        logger.warning(
            "🚨 INCIDENT #%d │ Severity: %s │ Entity: %d │ Role: %s │ Saved: %s",
            self._event_count, severity.name, eid, info.get("role"), incident_dir
        )

        # --- Send alert to backend API asynchronously ---
        if self.camera_ai_id:
            from .api_client import send_alert
            import threading
            threading.Thread(
                target=send_alert,
                args=(self.camera_ai_id, int(severity), severity.name, annotated, metadata),
                daemon=True
            ).start()

    # ------------------------------------------------------------------
    @staticmethod
    def _annotate_screenshot(frame, eid, info, severity, ts):
        """Draw event information overlay onto a screenshot before saving.

        Adds: event type banner, severity badge, timestamp, entity ID,
        and highlights the entity bounding box.

        Args:
            frame: BGR numpy array (will be mutated).
            eid: Entity tracking ID.
            info: Entity info dict.
            severity: SeverityLevel enum value.
            ts: datetime object of the incident.

        Returns:
            The annotated frame.
        """
        h, w = frame.shape[:2]
        role = info.get("role", "None")
        contact_type = info.get("contact_type", "None")

        # --- Severity-based banner color ---
        banner_colors = {
            SeverityLevel.HARASSMENT: (255, 0, 255),   # purple
            SeverityLevel.ASSAULT:    (0, 0, 255),     # red
            SeverityLevel.WEAPON:     (0, 0, 180),     # dark red
        }
        banner_color = banner_colors.get(severity, (0, 0, 255))

        # --- Top banner: event type + severity ---
        event_text = f"[{severity.name}] {role}"
        if contact_type not in ("None", "normal_contact"):
            event_text += f" ({contact_type})"

        # Draw semi-transparent banner
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 60), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        cv2.putText(frame, event_text, (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, banner_color, 2)

        # --- Second line: timestamp + entity ID ---
        time_text = f"Time: {ts.strftime('%Y-%m-%d %H:%M:%S')}  |  Entity ID: {eid}"
        cv2.putText(frame, time_text, (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # --- Highlight entity bounding box ---
        bbox = info.get("bbox", [])
        if len(bbox) >= 4:
            bx1, by1, bx2, by2 = map(int, bbox)
            cv2.rectangle(frame, (bx1, by1), (bx2, by2), banner_color, 3)
            # Entity ID label on box
            id_label = f"E{eid}"
            (lw, lh), _ = cv2.getTextSize(id_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (bx1, by1 - lh - 8), (bx1 + lw + 6, by1), banner_color, -1)
            cv2.putText(frame, id_label, (bx1 + 3, by1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

        # --- Weapon info (if applicable) ---
        weapon_name = info.get("weapon_name")
        if weapon_name:
            weapon_text = f"Weapon: {weapon_name} ({info.get('weapon_conf', 0)*100:.0f}%)"
            cv2.putText(frame, weapon_text, (10, h - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)

        return frame

    @property
    def total_incidents(self):
        """Return the total number of incidents logged this session."""
        return self._event_count
