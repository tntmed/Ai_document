import requests
from app.config import settings


def send_google_chat_message(message: str) -> bool:
    webhook_url = getattr(settings, "GOOGLE_CHAT_WEBHOOK_URL", None)

    if not webhook_url:
        return False

    try:
        response = requests.post(
            webhook_url,
            json={"text": message},
            timeout=10
        )
        return response.status_code in (200, 201)
    except Exception:
        return False