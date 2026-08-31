import type { Metadata } from "next";
import { ForgotPasswordContent } from "@/components/auth/ForgotPasswordContent";

export const metadata: Metadata = {
  title: "Forgot password — Detechtico",
  description: "Reset your Detechtico account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
