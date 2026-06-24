"""Physical contact detection between persons using pose keypoints.

Determines whether a person is an aggressor (their hands touch
another's body), a victim (another's hands touch their body),
or mutually involved.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)
from ..config import (
    CONTACT_KEYPOINT_CONF,
    CONTACT_THR_RATIO,
    CONTACT_THR_MIN,
    CONTACT_THR_MAX,
    CONTACT_MIN_BODY_VELOCITY,
    CONTACT_MIN_HAND_VELOCITY,
    CONTACT_ASSAULT_HAND_VEL,
    CONTACT_PUSH_HAND_VEL,
    CONTACT_HARASSMENT_DUR,
    CONTACT_GRABBING_DUR,
)

# Velocity / duration tracking cache across frames
_TRACK_CACHE = {}


def cleanup_cache(active_ids):
    """Remove stale entries from the tracking cache.

    Should be called by the main pipeline whenever entities are purged
    from the tracker to prevent memory leaks in long-running sessions.

    Args:
        active_ids: set or list of currently active entity IDs.
    """
    active = set(active_ids)
    removed = 0
    for k in list(_TRACK_CACHE.keys()):
        if k not in active:
            del _TRACK_CACHE[k]
            removed += 1
    if removed:
        logger.debug("Cache cleanup: removed %d stale entries", removed)


def get_closest_keypoint(aggressor_hand_kps, victim_body_kps):
    """حساب أقرب نقطة مفتاحية (keypoint) في جسم الضحية للأيدي المعتدية."""
    min_dist = float('inf')
    closest_idx = -1
    for hand in aggressor_hand_kps:
        for idx in range(17):
            pt = victim_body_kps[idx]
            # تجاهل النقاط غير المكتشفة (إحداثياتها [0, 0] في YOLO)
            if np.all(pt == 0):
                continue
            dist = np.linalg.norm(hand - pt)
            if dist < min_dist:
                min_dist = dist
                closest_idx = idx
    return closest_idx


def classify_contact_type(aggressor_hand_kps, victim_body_kps, hand_velocity, contact_duration):
    """تصنيف نوع التلامس بناءً على موضع التلامس والسرعة والمدة الزمنية."""
    closest_kp_index = get_closest_keypoint(aggressor_hand_kps, victim_body_kps)
    
    # 1 — تحرش: تلامس في الحوض (hips 11, 12) بحركة بطيئة ومتكررة
    sensitive_zones = [11, 12]
    if closest_kp_index in sensitive_zones and hand_velocity < CONTACT_MIN_HAND_VELOCITY and contact_duration > CONTACT_HARASSMENT_DUR:
        return "harassment", 0.85
    
    # 2 — اعتداء: تلامس في الرأس أو الكتفين بحركة سريعة
    assault_zones = [0, 1, 2, 3, 4, 5, 6]
    if closest_kp_index in assault_zones and hand_velocity > CONTACT_ASSAULT_HAND_VEL:
        return "assault", 0.90
    
    # 3 — دفع: تلامس في الجذع (الكتفين أو الحوض) بحركة سريعة
    push_zones = [5, 6, 11, 12]
    if closest_kp_index in push_zones and hand_velocity > CONTACT_PUSH_HAND_VEL:
        return "push", 0.75
    
    # 4 — إمساك: تلامس في الذراع أو الرسغ لفترة طويلة
    grab_zones = [7, 8, 9, 10]
    if closest_kp_index in grab_zones and contact_duration > CONTACT_GRABBING_DUR:
        return "grabbing", 0.80
    
    # 5 — تلامس عادي
    return "normal_contact", 0.50


def resolve_contact(pose_res, cur_box):
    """تحديد التلامس الجسدي والدور ونقاط الاتصال مع تتبع السرعات وحساب الفترات."""
    default_meta = {
        "contact_type": "None",
        "contact_conf": 0.0,
        "contact_duration": 0
    }

    if len(pose_res) == 0 or pose_res[0].keypoints is None:
        return False, "None", [], default_meta

    kpts  = pose_res[0].keypoints.xy.cpu().numpy()
    confs = pose_res[0].keypoints.conf.cpu().numpy()
    boxes = pose_res[0].boxes.xyxy.cpu().numpy()
    n = len(kpts)

    if n < 2:
        return False, "None", [], default_meta

    # --- تحديد الهيكل العظمي الأقرب للصندوق الحالي ---
    cx = (cur_box[0] + cur_box[2]) / 2
    cy = (cur_box[1] + cur_box[3]) / 2
    best_i, best_dist = -1, float('inf')
    for i, b in enumerate(boxes):
        bc = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
        d = (cx - bc[0]) ** 2 + (cy - bc[1]) ** 2
        if d < best_dist:
            best_dist, best_i = d, i

    if best_i == -1:
        return False, "None", [], default_meta

    # الحصول على معرّفات التتبع (Track IDs)
    ids = None
    if len(pose_res) > 0 and pose_res[0].boxes is not None and pose_res[0].boxes.id is not None:
        ids = pose_res[0].boxes.id.cpu().numpy().astype(int)

    # تنظيف الذاكرة المؤقتة لمنع تراكم الكيانات القديمة
    if len(_TRACK_CACHE) > 100:
        active_ids = set(ids) if ids is not None else set(range(n))
        for k in list(_TRACK_CACHE.keys()):
            if k not in active_ids:
                del _TRACK_CACHE[k]

    # تحديث الذاكرة المؤقتة لجميع الهياكل لحساب السرعات
    for idx in range(len(kpts)):
        tid = ids[idx] if ids is not None else idx
        b = boxes[idx]
        scx = (b[0] + b[2]) / 2
        scy = (b[1] + b[3]) / 2
        curr_centroid = np.array([scx, scy])

        # حساب سرعة حركة الجسم
        if tid in _TRACK_CACHE and "centroid" in _TRACK_CACHE[tid]:
            prev_centroid = _TRACK_CACHE[tid]["centroid"]
            vel = np.linalg.norm(curr_centroid - prev_centroid)
        else:
            vel = 0.0

        # نقاط الأيدي الحالية (wrists 9, 10)
        curr_hands = {}
        if confs[idx][9] > CONTACT_KEYPOINT_CONF:
            curr_hands[9] = kpts[idx][9]
        if confs[idx][10] > CONTACT_KEYPOINT_CONF:
            curr_hands[10] = kpts[idx][10]

        # حساب سرعة حركة الأيدي
        left_vel = 0.0
        right_vel = 0.0
        if tid in _TRACK_CACHE and "hands" in _TRACK_CACHE[tid]:
            prev_hands = _TRACK_CACHE[tid]["hands"]
            if 9 in curr_hands and 9 in prev_hands:
                left_vel = np.linalg.norm(curr_hands[9] - prev_hands[9])
            if 10 in curr_hands and 10 in prev_hands:
                right_vel = np.linalg.norm(curr_hands[10] - prev_hands[10])
        hand_vel = max(left_vel, right_vel)

        # حفظ البيانات في الكاش
        if tid not in _TRACK_CACHE:
            _TRACK_CACHE[tid] = {"contact_duration": 0}
        _TRACK_CACHE[tid]["centroid"] = curr_centroid
        _TRACK_CACHE[tid]["hands"] = curr_hands
        _TRACK_CACHE[tid]["velocity"] = vel
        _TRACK_CACHE[tid]["hand_velocity"] = hand_vel

    # جلب بيانات الحركة للشخص الحالي
    my_tid = ids[best_i] if ids is not None else best_i
    my_state = _TRACK_CACHE.get(my_tid, {"velocity": 0.0, "hand_velocity": 0.0})
    my_vel = my_state.get("velocity", 0.0)
    my_hand_vel = my_state.get("hand_velocity", 0.0)

    is_fast_movement = my_vel > CONTACT_MIN_BODY_VELOCITY
    is_aggressive_hand = my_hand_vel > CONTACT_MIN_HAND_VELOCITY

    # --- عتبة المسافة الديناميكية (15% من عرض الشخص) ---
    pw  = boxes[best_i][2] - boxes[best_i][0]
    thr = max(CONTACT_THR_MIN, min(CONTACT_THR_MAX, int(pw * CONTACT_THR_RATIO)))

    # تجميع نقاط يدي هذا الشخص
    my_hands = []
    if confs[best_i][9]  > CONTACT_KEYPOINT_CONF:
        my_hands.append(kpts[best_i][9])
    if confs[best_i][10] > CONTACT_KEYPOINT_CONF:
        my_hands.append(kpts[best_i][10])

    is_aggr, is_vict = False, False
    is_normal_contact = False
    contacts = []

    # --- فحص المعتدي (Aggressor): يدي تلمس جسم الآخرين ---
    for j in range(n):
        if j == best_i:
            continue
        other_body = [kpts[j][idx] for idx in range(5, 13)
                      if confs[j][idx] > CONTACT_KEYPOINT_CONF]
        for hand in my_hands:
            for pt in other_body:
                if np.linalg.norm(hand - pt) < thr:
                    if is_fast_movement and is_aggressive_hand:
                        is_aggr = True
                    else:
                        is_normal_contact = True
                    contacts.append(hand)

    # --- فحص الضحية (Victim): أيدي الآخرين تلمس جسمي ---
    my_body = [kpts[best_i][idx] for idx in range(5, 13)
               if confs[best_i][idx] > CONTACT_KEYPOINT_CONF]

    for j in range(n):
        if j == best_i:
            continue
        other_hands = []
        if confs[j][9]  > CONTACT_KEYPOINT_CONF:
            other_hands.append(kpts[j][9])
        if confs[j][10] > CONTACT_KEYPOINT_CONF:
            other_hands.append(kpts[j][10])

        other_tid = ids[j] if ids is not None else j
        other_state = _TRACK_CACHE.get(other_tid, {"velocity": 0.0, "hand_velocity": 0.0})
        other_vel = other_state.get("velocity", 0.0)
        other_hand_vel = other_state.get("hand_velocity", 0.0)
        other_is_fast = other_vel > CONTACT_MIN_BODY_VELOCITY
        other_is_aggr_hand = other_hand_vel > CONTACT_MIN_HAND_VELOCITY

        for hand in other_hands:
            for pt in my_body:
                if np.linalg.norm(hand - pt) < thr:
                    if other_is_fast and other_is_aggr_hand:
                        is_vict = True
                    else:
                        is_normal_contact = True
                    contacts.append(hand)

    # --- تحديد الدور الأساسي ---
    if is_aggr and is_vict:
        role = "Mutual (Both)"
    elif is_aggr:
        role = "Aggressor"
    elif is_vict:
        role = "Victim"
    elif is_normal_contact:
        role = "Normal Contact"
    else:
        role = "None"

    is_touching = (is_aggr or is_vict or is_normal_contact)

    # --- تحديث مدة التلامس (contact_duration) ---
    if is_touching:
        _TRACK_CACHE[my_tid]["contact_duration"] = _TRACK_CACHE[my_tid].get("contact_duration", 0) + 1
    else:
        _TRACK_CACHE[my_tid]["contact_duration"] = 0
    contact_duration = _TRACK_CACHE[my_tid]["contact_duration"]

    # --- تصنيف نوع التلامس إذا كان هناك تلامس ---
    contact_type = "None"
    contact_conf = 0.0
    if is_touching:
        for j in range(n):
            if j == best_i:
                continue
            other_tid = ids[j] if ids is not None else j
            other_state = _TRACK_CACHE.get(other_tid, {"velocity": 0.0, "hand_velocity": 0.0})
            other_hand_vel = other_state.get("hand_velocity", 0.0)

            # فحص إذا كنا نلمسهم
            we_touch_them = False
            other_body = [kpts[j][idx] for idx in range(5, 13)
                          if confs[j][idx] > CONTACT_KEYPOINT_CONF]
            for hand in my_hands:
                for pt in other_body:
                    if np.linalg.norm(hand - pt) < thr:
                        we_touch_them = True
                        break

            # فحص إذا كانوا يلمسوننا
            they_touch_us = False
            other_hands = []
            if confs[j][9] > CONTACT_KEYPOINT_CONF:
                other_hands.append(kpts[j][9])
            if confs[j][10] > CONTACT_KEYPOINT_CONF:
                other_hands.append(kpts[j][10])
            for hand in other_hands:
                for pt in my_body:
                    if np.linalg.norm(hand - pt) < thr:
                        they_touch_us = True
                        break

            if we_touch_them:
                c_type, c_conf = classify_contact_type(
                    my_hands, kpts[j], my_hand_vel, contact_duration
                )
                contact_type = c_type
                contact_conf = c_conf
                break
            elif they_touch_us:
                c_type, c_conf = classify_contact_type(
                    other_hands, kpts[best_i], other_hand_vel, contact_duration
                )
                contact_type = c_type
                contact_conf = c_conf
                break
        
        # تلامس عادي في حال عدم وجود أي سلوك عدواني
        if not (is_aggr or is_vict):
            contact_type = "normal_contact"
            contact_conf = 0.50

    meta = {
        "contact_type": contact_type,
        "contact_conf": contact_conf,
        "contact_duration": contact_duration
    }

    return is_touching, role, contacts, meta
