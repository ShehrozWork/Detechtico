import type { Metadata } from "next";
import { ExplainableAiListContent } from "@/components/dashboard/ExplainableAiListContent";

export const metadata: Metadata = {
  title: "Explainable AI",
  description:
    "Browse saved analyses and open explainable findings with evidence, confidence, and rule IDs.",
};

export default function ExplainableAiPage() {
  return <ExplainableAiListContent />;
}
