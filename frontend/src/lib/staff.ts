import type { User } from "@/lib/api-types";

export function isStaffUser(
  user: Pick<User, "is_staff" | "staff_role"> | null | undefined,
): boolean {
  return Boolean(user?.is_staff || user?.staff_role);
}

export function postAuthHomePath(
  user: Pick<User, "is_staff" | "staff_role"> | null | undefined,
  next: string | null = null,
): string {
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (isStaffUser(user)) {
    if (safeNext?.startsWith("/admin")) return safeNext;
    return "/admin";
  }

  return safeNext ?? "/dashboard";
}
