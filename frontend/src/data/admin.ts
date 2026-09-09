import type { IconName } from "@/components/ui/Icon";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: "layout" },
  { label: "Users", href: "/admin/users", icon: "user" },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: "banknote" },
  { label: "Jobs", href: "/admin/jobs", icon: "clock" },
  { label: "AI usage", href: "/admin/ai-usage", icon: "brain" },
  { label: "Audit", href: "/admin/audit", icon: "eye" },
  { label: "Security", href: "/admin/security", icon: "shield" },
];

export const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";
