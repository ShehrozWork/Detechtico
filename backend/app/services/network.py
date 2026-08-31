from __future__ import annotations

import re
from collections import defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ImportedTransaction

_NORMALIZE_RE = re.compile(r"[^a-z0-9]+")


def _normalize_merchant(name: str) -> str:
    cleaned = _NORMALIZE_RE.sub(" ", name.strip().lower()).strip()
    return cleaned or "unknown merchant"


def _short_name(name: str) -> str:
    parts = [part for part in re.split(r"\s+", name.strip()) if part]
    if not parts:
        return "UNK"
    if len(parts) == 1:
        return parts[0][:10].upper()
    return "".join(part[0] for part in parts[:3]).upper()


def _amount_band(amount: float) -> str:
    if amount <= 0:
        return "0"
    # Round to nearest 50 for pattern matching.
    return str(int(round(amount / 50.0) * 50))


def build_network_summary(db: Session, user_id: UUID) -> dict[str, Any]:
    rows = list(
        db.scalars(
            select(ImportedTransaction)
            .where(ImportedTransaction.user_id == user_id)
            .order_by(ImportedTransaction.created_at.desc())
            .limit(500)
        )
    )

    if not rows:
        return {
            "stats": [
                {"label": "Vendors", "value": "0"},
                {"label": "Connections", "value": "0"},
                {"label": "Suspicious clusters", "value": "0"},
            ],
            "vendors": [],
            "connections": [],
            "clusters": [],
            "transaction_count": 0,
        }

    vendors: dict[str, dict[str, Any]] = {}
    for txn in rows:
        key = _normalize_merchant(txn.merchant)
        bucket = vendors.get(key)
        if bucket is None:
            bucket = {
                "id": key.replace(" ", "-")[:64],
                "name": txn.merchant.strip() or "Unknown merchant",
                "shortName": _short_name(txn.merchant),
                "risk": int(txn.risk_score),
                "transactions": 0,
                "flagged": 0,
                "total_amount": 0.0,
                "amount_bands": set(),
                "files": set(),
                "dates": set(),
            }
            vendors[key] = bucket
        bucket["transactions"] += 1
        bucket["total_amount"] += float(txn.amount)
        bucket["risk"] = max(int(bucket["risk"]), int(txn.risk_score))
        if txn.status != "clear":
            bucket["flagged"] += 1
        bucket["amount_bands"].add(_amount_band(float(txn.amount)))
        bucket["files"].add(txn.source_filename)
        bucket["dates"].add(txn.txn_date)
        # Prefer the longest/most recent display name.
        if len(txn.merchant.strip()) > len(bucket["name"]):
            bucket["name"] = txn.merchant.strip()
            bucket["shortName"] = _short_name(txn.merchant)

    vendor_list = list(vendors.values())
    connections: list[dict[str, Any]] = []

    for i, left in enumerate(vendor_list):
        for right in vendor_list[i + 1 :]:
            reasons: list[str] = []
            shared_bands = left["amount_bands"] & right["amount_bands"]
            if shared_bands:
                reasons.append(f"Shared amount bands ({len(shared_bands)})")
            shared_files = left["files"] & right["files"]
            if shared_files:
                reasons.append(f"Same import file ({len(shared_files)})")
            shared_dates = left["dates"] & right["dates"]
            if len(shared_dates) >= 2:
                reasons.append(f"Overlapping dates ({len(shared_dates)})")
            if left["flagged"] and right["flagged"]:
                reasons.append("Both have flagged transactions")
            if left["risk"] >= 70 and right["risk"] >= 70:
                reasons.append("Both high risk")

            if len(reasons) >= 2:
                connections.append(
                    {
                        "fromName": left["name"],
                        "fromId": left["id"],
                        "toName": right["name"],
                        "toId": right["id"],
                        "reasons": reasons,
                        "score": len(reasons),
                    }
                )

    connections.sort(key=lambda item: (-item["score"], item["fromName"], item["toName"]))

    # Connected components for clusters among edge participants.
    adjacency: dict[str, set[str]] = defaultdict(set)
    by_id = {vendor["id"]: vendor for vendor in vendor_list}
    for edge in connections:
        adjacency[edge["fromId"]].add(edge["toId"])
        adjacency[edge["toId"]].add(edge["fromId"])

    seen: set[str] = set()
    clusters: list[dict[str, Any]] = []
    for node_id in adjacency:
        if node_id in seen:
            continue
        stack = [node_id]
        component: list[str] = []
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            component.append(current)
            stack.extend(adjacency[current] - seen)
        if len(component) < 2:
            continue
        members = [by_id[member_id] for member_id in component if member_id in by_id]
        avg_risk = round(sum(member["risk"] for member in members) / len(members))
        clusters.append(
            {
                "id": f"cluster-{len(clusters) + 1}",
                "title": f"Linked cluster ({len(members)} vendors)",
                "vendorCount": len(members),
                "avgRisk": avg_risk,
                "vendors": [
                    {"name": member["name"], "risk": member["risk"]}
                    for member in sorted(members, key=lambda item: -item["risk"])
                ],
            }
        )

    clusters.sort(key=lambda item: (-item["avgRisk"], -item["vendorCount"]))

    # Layout vendors on a circle for SVG rendering.
    import math

    cx, cy, radius = 320, 214, 150
    n = max(len(vendor_list), 1)
    for index, vendor in enumerate(sorted(vendor_list, key=lambda item: -item["risk"])):
        angle = (2 * math.pi * index / n) - (math.pi / 2)
        vendor["x"] = round(cx + radius * math.cos(angle), 1)
        vendor["y"] = round(cy + radius * math.sin(angle), 1)
        vendor.pop("amount_bands", None)
        vendor.pop("files", None)
        vendor.pop("dates", None)
        vendor.pop("total_amount", None)
        vendor.pop("flagged", None)

    return {
        "stats": [
            {"label": "Vendors", "value": str(len(vendor_list))},
            {"label": "Connections", "value": str(len(connections))},
            {"label": "Suspicious clusters", "value": str(len(clusters))},
        ],
        "vendors": sorted(vendor_list, key=lambda item: -item["risk"]),
        "connections": connections[:25],
        "clusters": clusters[:10],
        "transaction_count": len(rows),
    }
