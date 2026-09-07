import type { Metadata } from "next";
import { BillingSuccessClient } from "@/components/billing/BillingSuccessClient";

export const metadata: Metadata = {
  title: "Payment received",
};

export default function BillingSuccessPage() {
  return <BillingSuccessClient />;
}
