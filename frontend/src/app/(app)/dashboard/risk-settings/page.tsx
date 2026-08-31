import type { Metadata } from "next";
import { RiskSettingsContent } from "@/components/dashboard/RiskSettingsContent";

export const metadata: Metadata = {
  title: "Risk Configuration",
  description:
    "Customize detection thresholds and rules for your specific use case.",
};

export default function RiskSettingsPage() {
  return <RiskSettingsContent />;
}
