import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Import, analyze, and detect financial fraud patterns with Detechtico.",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
