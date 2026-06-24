"""Temporal smoothing to suppress false-positive detections.

A detection (violence, weapon, aggressor) is only confirmed if it
appears in at least ``threshold`` out of the last ``window`` frames.
This eliminates single-frame flickers that would otherwise trigger
false alerts.

Each tracked entity gets its own set of smoothers so that
noisy detections on one person do not affect another.
"""

from collections import deque
from ..config import TEMPORAL_WINDOW, TEMPORAL_THRESHOLD


class TemporalSmoother:
    """Sliding-window confirmation filter for a single detection type.

    Args:
        window: number of recent frames to consider.
        threshold: minimum positive detections within the window to confirm.
    """

    def __init__(self, window=TEMPORAL_WINDOW, threshold=TEMPORAL_THRESHOLD):
        self.history = deque(maxlen=window)
        self.threshold = threshold

    def confirm(self, detection: bool) -> bool:
        """Record a detection and return whether it is confirmed.

        Args:
            detection: True if the raw detector fired this frame.

        Returns:
            True only if the detection count within the window >= threshold.
        """
        self.history.append(int(detection))
        return sum(self.history) >= self.threshold


class EntitySmootherSet:
    """Bundle of three smoothers for a single tracked entity.

    Attributes:
        contact:   smooths harassment / violence contact detection.
        weapon:    smooths weapon involvement detection.
        aggressor: smooths aggressor role classification.
    """

    def __init__(self):
        self.contact   = TemporalSmoother()
        self.weapon    = TemporalSmoother()
        self.aggressor = TemporalSmoother()
