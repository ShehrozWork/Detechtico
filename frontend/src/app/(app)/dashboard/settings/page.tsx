import type { Metadata } from "next";
import { AccountSettingsContent } from "@/components/dashboard/AccountSettingsContent";

export const metadata: Metadata = {
  title: "Account",
  description: "Update your profile and password.",
};

export default function AccountSettingsPage() {
  return <AccountSettingsContent />;
}
