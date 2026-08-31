import type { Metadata } from "next";
import { NetworkAnalysisContent } from "@/components/dashboard/NetworkAnalysisContent";

export const metadata: Metadata = {
  title: "Network Analysis",
  description: "Map vendor relationships and detect shell company patterns.",
};

export default function NetworkAnalysisPage() {
  return <NetworkAnalysisContent />;
}
