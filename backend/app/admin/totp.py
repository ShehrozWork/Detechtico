from __future__ import annotations

import pyotp

from app.config import get_settings


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    issuer = get_settings().jwt_issuer
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    cleaned = (code or "").strip().replace(" ", "")
    if not cleaned.isdigit():
        return False
    return pyotp.TOTP(secret).verify(cleaned, valid_window=1)
