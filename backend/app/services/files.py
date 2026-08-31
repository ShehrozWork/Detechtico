from __future__ import annotations

import hashlib
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.config import get_settings
from app.errors import error

ALLOWED_TYPES = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "webp": "image/webp",
    "tiff": "image/tiff",
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_HTML_MARKERS = (b"<html", b"<!doctype html", b"<svg", b"<?xml")


@dataclass(frozen=True)
class StoredFile:
    storage_name: str
    path: Path
    detected_type: str
    mime: str
    size_bytes: int
    checksum_sha256: str
    original_filename: str


def sanitize_filename(name: str | None) -> str:
    raw = (name or "document").replace("\\", "/").split("/")[-1]
    raw = _CONTROL_CHARS.sub("", raw).strip() or "document"
    return raw[:255]


def _is_probably_text(sample: bytes) -> bool:
    if not sample:
        return False
    if b"\x00" in sample:
        return False
    lowered = sample[:256].lower()
    if any(marker in lowered for marker in _HTML_MARKERS):
        return False
    try:
        sample.decode("utf-8")
        return True
    except UnicodeDecodeError:
        try:
            sample.decode("latin-1")
            return True
        except UnicodeDecodeError:
            return False


def _office_kind(path: Path) -> str | None:
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
    except zipfile.BadZipFile:
        return None
    if any(name.startswith("xl/") for name in names):
        return "xlsx"
    if any(name.startswith("word/") for name in names):
        return "docx"
    return None


def detect_type(header: bytes, path: Path) -> str | None:
    if header.startswith(b"%PDF"):
        return "pdf"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "webp"
    if header.startswith(b"II*\x00") or header.startswith(b"MM\x00*"):
        return "tiff"
    if header.startswith(b"PK\x03\x04") or header.startswith(b"PK\x05\x06"):
        return _office_kind(path)
    if _is_probably_text(header):
        try:
            text = header.decode("utf-8")
        except UnicodeDecodeError:
            text = header.decode("latin-1")
        first_line = text.splitlines()[0] if text.strip() else ""
        if "," in first_line or "\t" in first_line:
            return "csv"
        return "txt"
    return None


async def save_upload(upload, user_id: str) -> StoredFile:
    settings = get_settings()
    original = sanitize_filename(getattr(upload, "filename", None))
    storage_name = uuid4().hex
    user_dir = settings.upload_dir.resolve() / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    dest = user_dir / storage_name

    hasher = hashlib.sha256()
    header = b""
    total = 0
    max_bytes = settings.max_upload_bytes

    try:
        with dest.open("wb") as out:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise error(413, "file_too_large", "File exceeds the 25 MB upload limit.")
                hasher.update(chunk)
                if len(header) < 512:
                    header += chunk[: 512 - len(header)]
                out.write(chunk)
            out.flush()

        if total == 0:
            raise error(400, "empty_file", "The uploaded file is empty.")

        detected = detect_type(header, dest)
        if detected is None or detected not in ALLOWED_TYPES:
            raise error(
                415,
                "unsupported_type",
                "Unsupported file type. Use PDF, PNG, JPG, WEBP, TIFF, CSV, XLSX, DOCX, or TXT.",
            )

        return StoredFile(
            storage_name=storage_name,
            path=dest,
            detected_type=detected,
            mime=ALLOWED_TYPES[detected],
            size_bytes=total,
            checksum_sha256=hasher.hexdigest(),
            original_filename=original,
        )
    except Exception:
        if dest.exists():
            dest.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()


def document_path(user_id: str, storage_name: str) -> Path:
    settings = get_settings()
    root = settings.upload_dir.resolve()
    path = (root / str(user_id) / storage_name).resolve()
    if root not in path.parents:
        raise error(400, "invalid_path", "Invalid file path.")
    return path
