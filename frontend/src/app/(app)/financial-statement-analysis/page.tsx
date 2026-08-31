import type { Metadata } from "next";
import { StatementAnalysisContent } from "@/components/dashboard/StatementAnalysisContent";

export const metadata: Metadata = {
  title: "Financial Statement Analysis",
  description:
    "Upload balance sheets, income statements, or cash flow statements for forensic analysis.",
};

export default function FinancialStatementAnalysisPage() {
  return <StatementAnalysisContent />;
}
