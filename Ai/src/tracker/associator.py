"""Entity tracking using ByteTrack IDs from Ultralytics.

ByteTrack handles cross-frame association internally, so this module
only manages entity *state* (role, weapons, lifecycle counters) — all
matching logic is delegated to the YOLO tracker.
"""

from ..config import MAX_MISSING_FRAMES, MAX_PERSIST


class EntityTracker:
    """Manages entity state using tracking IDs provided by ByteTrack.

    Unlike the previous greedy-centroid approach, this tracker does NOT
    perform any association itself.  It receives stable integer IDs from
    ``model.track(persist=True)`` and uses them as dictionary keys.
    """

    def __init__(self):
        """Initialise with empty entity store."""
        self.entities = {}

    # ------------------------------------------------------------------
    def update(self, person_boxes, track_ids):
        """Create / refresh entities using ByteTrack-assigned IDs.

        Args:
            person_boxes: numpy array of shape (N, 4) — xyxy format.
            track_ids: list/array of integer tracking IDs (length N).

        Returns:
            List of currently visible entity IDs.
        """
        cur_ids = []

        for idx, box in enumerate(person_boxes):
            tid = int(track_ids[idx])
            if tid not in self.entities:
                self.entities[tid] = {
                    "bbox": box,
                    "role": "None",
                    "contact_pts": [],
                    "weapon_name": None,
                    "weapon_conf": None,
                    "weapon_bbox": None,
                    "missing_cnt": 0,
                    "persist_cnt": MAX_PERSIST,
                }
            else:
                self.entities[tid]["bbox"] = box
                self.entities[tid]["missing_cnt"] = 0
            cur_ids.append(tid)

        # Increment missing counter; purge stale entities
        for eid in list(self.entities.keys()):
            if eid not in cur_ids:
                self.entities[eid]["missing_cnt"] += 1
                if self.entities[eid]["missing_cnt"] > MAX_MISSING_FRAMES:
                    del self.entities[eid]

        return cur_ids
