import type { Metadata } from "next";
import { AdaptiveLearningContent } from "@/components/dashboard/AdaptiveLearningContent";

export const metadata: Metadata = {
  title: "Adaptive Learning",
  description:
    "See how the system learns from your decisions to improve accuracy.",
};

export default function AdaptiveLearningPage() {
  return <AdaptiveLearningContent />;
}
