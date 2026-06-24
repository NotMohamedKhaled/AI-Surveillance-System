"""GPT-4V verification module for suspicious event confirmation.

Sends a frame to OpenAI's GPT-4o vision model for a second opinion
on whether a detected interaction is truly threatening.  This acts as
a **false-positive filter** — if GPT disagrees with the local models,
the alert is suppressed.
"""

import logging
import base64
import cv2
from openai import OpenAI
from ..config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

# --- Lazy client initialisation (only if key is available) ---
_client = None


def _get_client():
    """Return a cached OpenAI client, or None if no API key is configured."""
    global _client
    if _client is None and OPENAI_API_KEY:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def verify_with_gpt(frame, situation: str) -> tuple[bool, str, str]:
    """Send frame to GPT-4o and classify the physical interaction.

    Args:
        frame: BGR numpy array from the video source.
        situation: context string describing the detected contact type.

    Returns:
        ``(is_confirmed, explanation, classification)``

        * *is_confirmed*  — True only if GPT classifies the event as
          HARASSMENT, ASSAULT, or WEAPON_ASSAULT.
        * *explanation*   — one-sentence GPT response.
        * *classification* — one of NORMAL / HARASSMENT / ASSAULT / WEAPON_ASSAULT.

    .. important::
        On ANY error (network, rate-limit, missing key) the function
        returns ``(False, …, "UNAVAILABLE")`` so that false positives
        are **never** promoted due to an API outage.
    """
    client = _get_client()
    if client is None:
        logger.warning("GPT verification skipped — no API key configured")
        return False, "GPT unavailable — no API key", "UNAVAILABLE"

    try:
        _, buffer = cv2.imencode('.jpg', frame)
        image_b64 = base64.b64encode(buffer).decode()

        text = """You are an AI security camera analyst. Look at this image carefully.

Classify the physical interaction between the people as ONE of these:
- NORMAL: Friendly contact — shoulder touch, casual gestures, smiling, handshakes
- HARASSMENT: Unwanted touching of sensitive body areas — waist, midsection, hips
- ASSAULT: Forceful pushing or shoving from the chest area
- WEAPON_ASSAULT: Any weapon involvement — knife, gun, stick, or similar object

Reply with ONLY the classification word, then a colon, then one sentence.
Example: NORMAL: Two people greeting each other with a handshake."""

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=60,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                    {"type": "text", "text": text}
                ]
            }]
        )

        answer = response.choices[0].message.content.strip()
        classification = answer.split(":")[0].strip().upper()
        is_confirmed = classification in ("HARASSMENT", "ASSAULT", "WEAPON_ASSAULT")

        logger.info("GPT-4o verdict: %s (confirmed=%s)", classification, is_confirmed)
        return is_confirmed, answer, classification

    except Exception as e:
        logger.error("GPT verification failed: %s", e)
        # SAFE DEFAULT: do NOT confirm the threat on API failure
        return False, f"GPT unavailable — {e}", "UNAVAILABLE"

