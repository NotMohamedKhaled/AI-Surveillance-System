"""Drawing / annotation logic for the forensic security overlay.

Responsible for rendering bounding boxes, role labels, contact
points, weapon highlights, and FPS counter onto each video frame.
"""

import time
import cv2
from ..config import MAX_PERSIST


class Drawer:
    """Renders all visual annotations onto a video frame."""

    # Person role colors
    COLORS = {
        "Normal":           (0, 255, 0),
        "Aggressor":        (0, 0, 255),
        "Armed Aggressor":  (0, 0, 255),
        "Mutual (Both)":    (0, 0, 255),
        "Victim":           (0, 165, 255),
        "Armed Victim":     (0, 165, 255),
        "None":             (0, 255, 0),
        "Normal Contact":   (0, 255, 0),

        # Contact type colors
        "harassment":       (255, 0, 255),
        "assault":          (0, 0, 255),
        "normal_contact":   (0, 255, 0),
    }

    # GPT classification colors
    GPT_COLORS = {
        "NORMAL":         (0, 255, 0),
        "HARASSMENT":     (255, 0, 255),
        "ASSAULT":        (0, 0, 255),
        "WEAPON_ASSAULT": (0, 0, 200),
    }

    # ------------------------------------------------------------------
    #  Text wrapping & safe drawing utilities
    # ------------------------------------------------------------------
    @staticmethod
    def _wrap_text(text, font, font_scale, thickness, max_width):
        """Split text into multiple lines that fit within max_width pixels.

        Args:
            text: The string to wrap.
            font: OpenCV font constant.
            font_scale: Font scale factor.
            thickness: Text thickness.
            max_width: Maximum pixel width per line.

        Returns:
            List of strings, one per line.
        """
        if not text:
            return []
        # First check if it fits on one line
        (tw, _), _ = cv2.getTextSize(text, font, font_scale, thickness)
        if tw <= max_width:
            return [text]

        # Split by words
        words = text.split()
        lines = []
        current_line = ""
        for word in words:
            test = f"{current_line} {word}".strip()
            (tw, _), _ = cv2.getTextSize(test, font, font_scale, thickness)
            if tw <= max_width:
                current_line = test
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)

        # Fallback: if a single word is too long, truncate with "…"
        result = []
        for line in lines:
            (tw, _), _ = cv2.getTextSize(line, font, font_scale, thickness)
            if tw > max_width:
                while len(line) > 3:
                    line = line[:-1]
                    (tw, _), _ = cv2.getTextSize(line + "…", font, font_scale, thickness)
                    if tw <= max_width:
                        line += "…"
                        break
            result.append(line)
        return result

    @staticmethod
    def _clamp(val, lo, hi):
        """Clamp a value between lo and hi."""
        return max(lo, min(hi, val))

    @classmethod
    def _draw_label(cls, frame, text, x, y, font, font_scale, thickness,
                    text_color, bg_color, max_width=None, padding=4):
        """Draw a label with background, wrapping and clamping to frame bounds.

        Args:
            frame: BGR numpy array (mutated in place).
            text: Label string (may be wrapped).
            x, y: Top-left anchor for the label background.
            font: OpenCV font constant.
            font_scale: Font scale.
            thickness: Text thickness.
            text_color: (B, G, R) tuple for text.
            bg_color: (B, G, R) tuple for background, or None to skip.
            max_width: Max pixel width before wrapping (None = frame width - x).
            padding: Pixels of padding around text.
        """
        h, w = frame.shape[:2]
        if max_width is None:
            max_width = w - x - 10

        lines = cls._wrap_text(text, font, font_scale, thickness, max_width)
        if not lines:
            return

        # Measure all lines
        line_sizes = []
        for line in lines:
            (tw, th), baseline = cv2.getTextSize(line, font, font_scale, thickness)
            line_sizes.append((tw, th, baseline))

        total_h = sum(th + padding for _, th, _ in line_sizes)
        max_tw = max(tw for tw, _, _ in line_sizes)

        # Clamp position to stay within frame
        x = cls._clamp(x, 0, w - max_tw - padding * 2)
        y = cls._clamp(y, 0, h - total_h - padding)

        # Draw background rectangle
        if bg_color is not None:
            cv2.rectangle(
                frame,
                (x, y),
                (x + max_tw + padding * 2, y + total_h + padding),
                bg_color, -1
            )

        # Draw each line
        cursor_y = y + padding
        for i, line in enumerate(lines):
            tw, th, baseline = line_sizes[i]
            cursor_y += th
            cv2.putText(frame, line, (x + padding, cursor_y),
                        font, font_scale, text_color, thickness)
            cursor_y += padding

    # ------------------------------------------------------------------
    #  Main draw entry point
    # ------------------------------------------------------------------
    def draw(self, frame, entities, weapon_boxes_raw, weapon_detector,
             last_gpt_display=None, gpt_display_timeout=15):
        """Draw all annotations onto *frame* (mutates in place)."""
        self._draw_gpt_overlay(frame, last_gpt_display, gpt_display_timeout)
        self._draw_entities(frame, entities)
        self._draw_loose_weapons(frame, entities, weapon_boxes_raw, weapon_detector)
        return frame

    # ------------------------------------------------------------------
    def _draw_gpt_overlay(self, frame, last_gpt_display, gpt_display_timeout):
        """Render a persistent GPT evaluation banner at the top of the screen."""
        if not last_gpt_display:
            return

        classification = last_gpt_display.get("classification", "")
        text = last_gpt_display.get("text", "")
        timestamp = last_gpt_display.get("timestamp", 0)

        if not classification or not text:
            return

        elapsed = time.time() - timestamp
        if elapsed > gpt_display_timeout:
            last_gpt_display["text"] = ""
            last_gpt_display["classification"] = ""
            return

        short = text.split(":")[1].strip()[:80] if ":" in text else text[:80]
        display_text = f"[{classification}] {short}"
        color = self.GPT_COLORS.get(classification, (200, 200, 200))

        h, w = frame.shape[:2]
        max_w = w - 30

        lines = self._wrap_text(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2, max_w)
        total_h = len(lines) * 28
        overlay = frame.copy()
        cv2.rectangle(overlay, (5, 5), (w - 5, total_h + 15), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        for i, line in enumerate(lines):
            cv2.putText(frame, line, (10, 25 + i * 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    # ------------------------------------------------------------------
    def _draw_entities(self, frame, entities):
        """Draw person boxes, role labels, and contact points."""
        h, w = frame.shape[:2]

        for eid, info in entities.items():
            x1, y1, x2, y2 = map(int, info["bbox"])
            role = info["role"]
            contact_type = info.get("contact_type", "None")
            gpt_confirmed = info.get("gpt_confirmed")  # None=not checked, True=threat, False=normal
            gpt_classification = info.get("gpt_classification", "")
            box_w = x2 - x1

            # --- Determine color and label ---
            # Priority: GPT verdict > YOLO role > default
            if gpt_confirmed is False:
                # GPT explicitly said NORMAL — override everything
                color = self.COLORS["Normal"]
                label = "Normal"
            elif role.startswith("Armed"):
                color = self.COLORS.get(role, (0, 0, 255))
                wname = info.get('weapon_name', 'Unknown')
                wconf = info.get('weapon_conf', 0) or 0
                label = f"{role} [{wname.capitalize()} {wconf*100:.0f}%]"
            elif contact_type in ("harassment", "assault", "push", "grabbing"):
                color = self.COLORS.get(contact_type, (0, 255, 0))
                # Check if there is a weapon involved anyway (sometimes role drops "Armed" if contact is strong)
                if info.get('weapon_name'):
                    wname = info.get('weapon_name')
                    wconf = info.get('weapon_conf', 0) or 0
                    label = f"{role} ({contact_type}) [{wname.capitalize()} {wconf*100:.0f}%]"
                else:
                    label = f"{role} ({contact_type})"
            elif contact_type == "normal_contact" or role == "Normal Contact":
                color = self.COLORS.get("Normal Contact", (0, 255, 0))
                label = "Normal Contact"
            elif role in ("Aggressor", "Victim", "Mutual (Both)"):
                color = self.COLORS.get(role, (0, 255, 0))
                label = role
            else:
                color = self.COLORS.get("Normal", (0, 255, 0))
                label = "Normal"

            # --- Draw person bounding box ---
            thickness = 3 if role not in ("None", "Normal", "Normal Contact") else 2
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

            # --- Draw role label (above box, clamped) ---
            label_max_w = max(box_w, 120)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            txt_x = self._clamp(x1, 0, w - tw - 8)
            txt_y = y1 - th - 10 if y1 - th - 10 > 0 else y1 + th + 15

            self._draw_label(
                frame, label, txt_x, txt_y - th - 4,
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2,
                (255, 255, 255), color, max_width=label_max_w
            )

            # --- GPT text below the box (clamped + wrapped) ---
            gpt_text = info.get("gpt_text", "")

            if gpt_classification:
                gpt_color = self.GPT_COLORS.get(gpt_classification, (200, 200, 200))
                short_explanation = gpt_text.split(":")[1].strip()[:60] if ":" in gpt_text else gpt_text[:60]
                display_text = f"[{gpt_classification}] {short_explanation}"

                gpt_max_w = max(box_w, 150)
                gpt_y = min(y2 + 2, h - 30)
                gpt_x = self._clamp(x1, 0, w - 100)

                self._draw_label(
                    frame, display_text, gpt_x, gpt_y,
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1,
                    (255, 255, 255), gpt_color, max_width=gpt_max_w
                )

            # --- Contact points ---
            if role in ("Aggressor", "Victim", "Mutual (Both)", "Normal Contact"):
                for pt in info.get("contact_pts", []):
                    px = self._clamp(int(pt[0]), 25, w - 25)
                    py = self._clamp(int(pt[1]), 40, h - 25)
                    cv2.circle(frame, (px, py), 15, (0, 255, 255), -1)
                    cv2.circle(frame, (px, py), 25, (0, 0, 255), 3)
                    lbl_x = self._clamp(px - 30, 0, w - 70)
                    lbl_y = self._clamp(py - 35, 15, h - 5)
                    cv2.putText(frame, "Contact!", (lbl_x, lbl_y),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

            # --- Weapon box ---
            if role.startswith("Armed") and info["weapon_bbox"] is not None:
                wx1, wy1, wx2, wy2 = map(int, info["weapon_bbox"])
                cv2.rectangle(frame, (wx1, wy1), (wx2, wy2), (255, 0, 255), 3)
                w_label = f"{info['weapon_name']}: {info['weapon_conf']*100:.1f}%"
                wlbl_x = self._clamp(wx1, 0, w - 80)
                wlbl_y = wy1 - 10 if wy1 - 30 > 0 else wy1 + 25

                self._draw_label(
                    frame, w_label, wlbl_x, wlbl_y - 20,
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2,
                    (255, 255, 255), (255, 0, 255), max_width=max(wx2 - wx1, 100)
                )

    # ------------------------------------------------------------------
    @staticmethod
    def _draw_loose_weapons(frame, entities, weapon_boxes_raw, weapon_detector):
        """Draw weapons not associated with any tracked person."""
        h, w = frame.shape[:2]

        for wb in weapon_boxes_raw:
            wx1, wy1, wx2, wy2 = map(int, wb.xyxy[0])
            cls_id = int(wb.cls[0])
            conf   = float(wb.conf[0])
            name   = weapon_detector.get_class_name(cls_id)

            already_drawn = any(
                info.get("weapon_bbox") == (wx1, wy1, wx2, wy2)
                for info in entities.values()
                if info.get("weapon_bbox") is not None
            )
            if already_drawn:
                continue

            cv2.rectangle(frame, (wx1, wy1), (wx2, wy2), (255, 0, 255), 2)
            label = f"{name}: {conf*100:.1f}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            lx = max(0, min(wx1, w - tw - 5))
            ly = wy1 - 5 if wy1 - th - 5 > 0 else wy1 + th + 10
            cv2.rectangle(frame, (lx, ly - th - 5), (lx + tw, ly + 5),
                          (255, 0, 255), -1)
            cv2.putText(frame, label, (lx, ly),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # ------------------------------------------------------------------
    @staticmethod
    def draw_fps(frame, fps_value):
        """Render an FPS counter in the bottom-right corner."""
        h, w = frame.shape[:2]
        text = f"FPS: {fps_value:.1f}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        x = w - tw - 15
        y = h - 15
        overlay = frame.copy()
        cv2.rectangle(overlay, (x - 5, y - th - 5), (x + tw + 5, y + 5), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
        cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

