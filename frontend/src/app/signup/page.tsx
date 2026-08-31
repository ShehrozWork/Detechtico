import type { Metadata } from "next";
import { SignupContent } from "@/components/auth/SignupContent";

export const metadata: Metadata = {
  title: "Sign up — Detechtico",
  description:
    "Create a Detechtico account to get started with explainable financial statement analysis.",
};

export default function SignupPage() {
  return <SignupContent />;
}
