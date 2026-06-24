"""Weapon involvement detection using pose keypoints and weapon boxes.

Determines whether a person is *holding* a weapon (Armed Aggressor)
or *threatened* by a nearby weapon (Armed Victim).
"""

import numpy as np
from ..config import (
    WEAPON_HAND_CONF,
    WEAPON_BODY_CONF,
    WEAPON_THR_RATIO,
    WEAPON_THR_MIN,
    WEAPON_THR_MAX,
    WEAPON_THREAT_MULTIPLIER,
)


def resolve_weapon(pose_res, weapon_boxes, cur_box, weapon_detector):
    """Detect if a person holds or is threatened by a weapon.

    Args:
        pose_res: YOLO pose estimation Results list.
        weapon_boxes: raw weapon detection boxes (from Results.boxes).
        cur_box: bounding box [x1, y1, x2, y2] of the person under test.
        weapon_detector: WeaponDetector instance (for class-name lookup).

    Returns:
        (is_involved, role, weapon_info_list)
        - is_involved: bool
        - role: 'Armed Aggressor' | 'Armed Victim' | 'None'
        - weapon_info_list: list of (x1, y1, x2, y2, class_name, conf)
    """
    if len(weapon_boxes) == 0:
        return False, "None", []
    if (len(pose_res) == 0
            or pose_res[0].keypoints is None
            or pose_res[0].keypoints.conf is None):
        return False, "None", []

    kpts         = pose_res[0].keypoints.xy.cpu().numpy()
    confs        = pose_res[0].keypoints.conf.cpu().numpy()
    person_boxes = pose_res[0].boxes.xyxy.cpu().numpy()
    n = len(kpts)

    if n < 2:
        return False, "None", []

    # --- Match cur_box to the closest pose skeleton ---
    cx = (cur_box[0] + cur_box[2]) / 2
    cy = (cur_box[1] + cur_box[3]) / 2
    best_i, best_dist = -1, float('inf')
    for i, b in enumerate(person_boxes):
        bc = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
        d = (cx - bc[0]) ** 2 + (cy - bc[1]) ** 2
        if d < best_dist:
            best_dist, best_i = d, i

    if best_i == -1:
        return False, "None", []

    # --- Dynamic threshold: 25 % of person width ---
    pw  = person_boxes[best_i][2] - person_boxes[best_i][0]
    thr = max(WEAPON_THR_MIN, min(WEAPON_THR_MAX, int(pw * WEAPON_THR_RATIO)))

    is_aggr, is_vict = False, False
    w_info = []

    for w in weapon_boxes:
        wx1, wy1, wx2, wy2 = map(int, w.xyxy[0])
        cls_id = int(w.cls[0])
        conf   = float(w.conf[0])
        name   = weapon_detector.get_class_name(cls_id)
        w_center = ((wx1 + wx2) / 2, (wy1 + wy2) / 2)

        # -- Holding check (hands near weapon) --
        hands = []
        if confs[best_i][9]  > WEAPON_HAND_CONF:
            hands.append(kpts[best_i][9])
        if confs[best_i][10] > WEAPON_HAND_CONF:
            hands.append(kpts[best_i][10])

        holding = False
        for hand in hands:
            inside = (wx1 <= hand[0] <= wx2 and wy1 <= hand[1] <= wy2)
            close  = np.linalg.norm(hand - w_center) < thr
            if inside or close:
                is_aggr = True
                holding = True
                w_info.append((wx1, wy1, wx2, wy2, name, conf))
                break

        # -- Threatened check (body near weapon) --
        if not holding:
            body = [kpts[best_i][idx] for idx in range(5, 13)
                    if confs[best_i][idx] > WEAPON_BODY_CONF]
            for pt in body:
                inside = (wx1 <= pt[0] <= wx2 and wy1 <= pt[1] <= wy2)
                close  = np.linalg.norm(pt - w_center) < thr * WEAPON_THREAT_MULTIPLIER
                if inside or close:
                    is_vict = True
                    w_info.append((wx1, wy1, wx2, wy2, name, conf))
                    break

    # --- Determine role ---
    role = "None"
    if is_aggr:
        role = "Armed Aggressor"
    elif is_vict:
        role = "Armed Victim"

    return (is_aggr or is_vict), role, w_info
