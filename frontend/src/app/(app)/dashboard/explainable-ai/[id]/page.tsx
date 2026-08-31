import type { Metadata } from "next";
import { ExplainableAiContent } from "@/components/dashboard/ExplainableAiContent";

type ExplainableAiDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Analysis findings",
  description:
    "Inspect why each forensic finding was raised — evidence, confidence, rule IDs, and AI rationale.",
};

export default async function ExplainableAiDetailPage({
  params,
}: ExplainableAiDetailPageProps) {
  const { id } = await params;
  return <ExplainableAiContent jobId={id} />;
}
