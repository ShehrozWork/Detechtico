from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

from app.config import Settings, get_settings
from app.errors import error

logger = logging.getLogger("detechtico.mail")


def smtp_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(cfg.smtp_host and cfg.smtp_username and cfg.smtp_password and cfg.smtp_from_email)


def _smtp_failure_message(exc: BaseException) -> str:
    """Map common SMTP failures to actionable (non-secret) client messages."""
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "Email login failed. Check SMTP_USERNAME and SMTP_PASSWORD on the API host."
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "SMTP rejected the From address. Set SMTP_FROM_EMAIL to an allowed sender."
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "SMTP rejected the recipient address. Try a different email."
    if isinstance(exc, (TimeoutError, smtplib.SMTPServerDisconnected, ConnectionError, OSError)):
        return (
            "Could not reach the SMTP server. Check SMTP_HOST, SMTP_PORT, firewall, "
            "and that the API container can open outbound TCP."
        )
    if isinstance(exc, ssl.SSLError):
        return "SMTP TLS failed. For port 587 use SMTP_USE_TLS=true; for 465 use SSL (not STARTTLS)."
    text = str(exc).lower()
    if "authentication" in text or "auth" in text or "username" in text or "password" in text:
        return "Email login failed. Check SMTP_USERNAME and SMTP_PASSWORD on the API host."
    if "timed out" in text or "timeout" in text:
        return (
            "SMTP connection timed out. Check SMTP_HOST/SMTP_PORT and outbound access "
            "from the API host."
        )
    return "Could not send email. Please try again."


def send_email(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    settings: Settings | None = None,
) -> None:
    cfg = settings or get_settings()
    if not smtp_configured(cfg):
        raise error(
            503,
            "email_not_configured",
            "Email delivery is not configured. Set SMTP_* in the server environment.",
        )

    domain = cfg.smtp_from_email.split("@")[-1] if "@" in cfg.smtp_from_email else "localhost"
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{cfg.smtp_from_name} <{cfg.smtp_from_email}>"
    message["To"] = to_email
    message["Reply-To"] = cfg.smtp_from_email
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = make_msgid(domain=domain)
    message["X-Mailer"] = "Detechtico"
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as smtp:
            smtp.ehlo()
            if cfg.smtp_use_tls:
                context = ssl.create_default_context()
                smtp.starttls(context=context)
                smtp.ehlo()
            smtp.login(cfg.smtp_username, cfg.smtp_password)
            # Explicit envelope sender helps some shared hosts deliver reliably.
            refused = smtp.send_message(message, from_addr=cfg.smtp_from_email, to_addrs=[to_email])
            if refused:
                logger.error("SMTP refused recipients: %s", refused)
                raise error(502, "email_send_failed", "SMTP rejected the recipient address. Try a different email.")
        logger.info("Email accepted by SMTP for %s subject=%s", to_email, subject)
    except Exception as exc:
        if hasattr(exc, "status_code"):
            raise
        logger.exception(
            "Failed to send email to %s host=%s port=%s tls=%s",
            to_email,
            cfg.smtp_host,
            cfg.smtp_port,
            cfg.smtp_use_tls,
        )
        raise error(502, "email_send_failed", _smtp_failure_message(exc)) from None


def send_signup_otp(to_email: str, otp: str, settings: Settings | None = None) -> None:
    cfg = settings or get_settings()
    subject = "Verify your Detechtico account"
    text = (
        f"Your verification code is {otp}.\n\n"
        "Enter this code to finish creating your Detechtico account.\n"
        "It expires in 10 minutes. If you did not sign up, ignore this message.\n"
    )
    html = (
        f"<p>Your verification code is <strong style='font-size:18px;letter-spacing:2px'>{otp}</strong>.</p>"
        "<p>Enter this code to finish creating your Detechtico account.</p>"
        "<p>It expires in 10 minutes. If you did not sign up, ignore this message.</p>"
    )
    send_email(to_email=to_email, subject=subject, text_body=text, html_body=html, settings=cfg)


def send_email_change_otp(to_email: str, otp: str, settings: Settings | None = None) -> None:
    cfg = settings or get_settings()
    subject = "Your Detechtico email change code"
    text = (
        f"Your verification code is {otp}.\n\n"
        "Enter this code in Account settings to confirm your new email address.\n"
        "It expires in 10 minutes. If you did not request this, ignore this message.\n"
    )
    html = (
        f"<p>Your verification code is <strong style='font-size:18px;letter-spacing:2px'>{otp}</strong>.</p>"
        "<p>Enter this code in Account settings to confirm your new email address.</p>"
        "<p>It expires in 10 minutes. If you did not request this, ignore this message.</p>"
    )
    send_email(to_email=to_email, subject=subject, text_body=text, html_body=html, settings=cfg)


def send_email_change_alert(
    *,
    to_email: str,
    new_email: str,
    revert_url: str,
    settings: Settings | None = None,
) -> None:
    cfg = settings or get_settings()
    subject = "Security alert: your Detechtico email was changed"
    text = (
        "Your Detechtico account email address was changed.\n\n"
        f"New email: {new_email}\n\n"
        "If you made this change, you can ignore this message.\n"
        "If you did not make this request, revert immediately using this link:\n"
        f"{revert_url}\n\n"
        "This link expires in 72 hours.\n"
    )
    html = (
        "<p>Your Detechtico account email address was changed.</p>"
        f"<p>New email: <strong>{new_email}</strong></p>"
        "<p>If you made this change, you can ignore this message.</p>"
        "<p>If you did <strong>not</strong> make this request, revert immediately:</p>"
        f'<p><a href="{revert_url}">Revert email change and secure my account</a></p>'
        "<p>This link expires in 72 hours.</p>"
    )
    send_email(to_email=to_email, subject=subject, text_body=text, html_body=html, settings=cfg)
