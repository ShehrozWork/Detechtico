import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: {
    default: "Admin — Detechtico",
    template: "%s — Admin — Detechtico",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminGate>
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  );
}
