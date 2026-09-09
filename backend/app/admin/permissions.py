from __future__ import annotations

STAFF_ROLES = frozenset({"support", "billing_ops", "superadmin"})

ROLE_RANK = {
    "support": 1,
    "billing_ops": 2,
    "superadmin": 3,
}

# Permission → minimum role rank required
PERMISSIONS: dict[str, int] = {
    "users.read": 1,
    "users.force_logout": 1,
    "users.password_reset": 1,
    "audit.read": 1,
    "jobs.read": 1,
    "subscriptions.read": 1,
    "overview.read": 1,
    "ai_usage.read": 1,
    "billing.sync": 2,
    "billing.cancel": 2,
    "billing.comp": 2,
    "users.trial": 2,
    "users.deactivate": 3,
    "users.activate": 3,
    "jobs.requeue": 3,
    "jobs.abandon": 3,
    "documents.delete": 3,
    "documents.reveal": 3,
    "staff.manage": 3,
}


def is_staff_role(role: str | None) -> bool:
    return role in STAFF_ROLES


def has_permission(role: str | None, permission: str) -> bool:
    if role not in ROLE_RANK:
        return False
    required = PERMISSIONS.get(permission)
    if required is None:
        return False
    return ROLE_RANK[role] >= required
