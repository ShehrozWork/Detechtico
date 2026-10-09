import type { AnalysisJob, Finding } from "@/lib/api-types";

const statementLabel: Record<string, string> = {
  "balance-sheet": "Balance Sheet",
  income: "Income Statement",
  "cash-flow": "Statement of Cash Flows",
};

const severityOrder: Record<Finding["severity"], number> = { high: 0, medium: 1, low: 2 };

const severityColor: Record<Finding["severity"], [number, number, number]> = {
  high: [159, 18, 57],
  medium: [180, 83, 9],
  low: [71, 85, 105],
};

const dispositionLabel: Record<string, string> = {
  confirmed: "Confirmed",
  dismissed: "Dismissed",
  needs_info: "Needs info",
};

/** The built-in PDF fonts only cover Latin-1; map common typography and drop the rest. */
function pdfText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[   ]/g, " ")
    .replace(/[^\n\x20-\x7E¡-ÿ]/g, "");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function confidencePct(finding: Finding) {
  return typeof finding.confidence === "number" && Number.isFinite(finding.confidence)
    ? `${Math.round(Math.max(0, Math.min(1, finding.confidence)) * 100)}%`
    : "-";
}

function sourceLabel(finding: Finding) {
  return finding.source === "rule" ? "Rule check" : "AI review";
}

function reportFilename(job: AnalysisJob) {
  const base = (job.original_filename ?? "analysis").replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^\w.-]+/g, "_").slice(0, 60) || "analysis";
  const day = new Date().toISOString().slice(0, 10);
  return `Detechtico_Findings_${safe}_${day}.pdf`;
}

export async function downloadFindingsReport(job: AnalysisJob) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin - 20;
  let y = margin;

  const lastTableY = () =>
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  };

  const writeParagraph = (
    text: string,
    options: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; indent?: number; gap?: number } = {},
  ) => {
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    doc.setFont("helvetica", options.style ?? "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [30, 41, 59]));
    const lineHeight = size * 1.4;
    const lines = doc.splitTextToSize(pdfText(text), contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, margin + indent, y + size);
      y += lineHeight;
    }
    y += options.gap ?? 4;
  };

  const findings = [...job.findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
  const counts = {
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length,
  };
  const overall =
    counts.high > 0 ? "High" : counts.medium > 0 ? "Medium" : counts.low > 0 ? "Low" : "No findings";

  // --- Header ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 6, "F");
  writeParagraph("DETECHTICO", { size: 9, style: "bold", color: [100, 116, 139], gap: 2 });
  writeParagraph("Forensic Findings Report", { size: 20, style: "bold", color: [15, 23, 42], gap: 10 });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 0, right: 8 }, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 130, textColor: [100, 116, 139] } },
    body: [
      ["Document", pdfText(job.original_filename ?? "Untitled document")],
      ["Statement type", statementLabel[job.statement_type ?? ""] ?? "Not specified"],
      ["Analyzed", formatDate(job.finished_at ?? job.created_at)],
      ["Report generated", formatDate(new Date().toISOString())],
      [
        "Review method",
        job.llm_status === "succeeded"
          ? "Deterministic rule checks + AI forensic review"
          : "Deterministic rule checks (AI review unavailable for this run)",
      ],
      ["Analysis ID", job.id],
    ],
  });
  y = lastTableY() + 18;

  // --- Executive summary ---
  writeParagraph("Executive summary", { size: 13, style: "bold", color: [15, 23, 42], gap: 6 });
  writeParagraph(
    findings.length
      ? `${findings.length} distinct finding${findings.length === 1 ? "" : "s"} raised: ${counts.high} high, ${counts.medium} medium, ${counts.low} low severity. Overall risk indication: ${overall}.`
      : "No suspicious patterns were supported by the extracted content. This is not a guarantee that the statement is free of misstatement or fraud.",
    { gap: 8 },
  );

  if (findings.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Finding", "Severity", "Confidence", "Source", "Review status"]],
      body: findings.map((finding, index) => [
        String(index + 1),
        pdfText(finding.title),
        finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1),
        confidencePct(finding),
        sourceLabel(finding),
        finding.disposition ? dispositionLabel[finding.disposition] ?? finding.disposition : "Open",
      ]),
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 58 },
        3: { cellWidth: 64, halign: "center" },
        4: { cellWidth: 66 },
        5: { cellWidth: 72 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const finding = findings[data.row.index];
          if (finding) {
            data.cell.styles.textColor = severityColor[finding.severity];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = lastTableY() + 22;

    // --- Detailed findings ---
    ensureSpace(40);
    writeParagraph("Detailed findings", { size: 13, style: "bold", color: [15, 23, 42], gap: 8 });

    findings.forEach((finding, index) => {
      ensureSpace(70);
      doc.setDrawColor(...severityColor[finding.severity]);
      doc.setLineWidth(2);
      const blockTop = y;
      const blockPage = doc.getNumberOfPages();
      writeParagraph(`${index + 1}. ${finding.title}`, { size: 11, style: "bold", color: [15, 23, 42], indent: 10, gap: 2 });
      writeParagraph(
        [
          `Severity: ${finding.severity.toUpperCase()}`,
          `Confidence: ${confidencePct(finding)}`,
          `Source: ${sourceLabel(finding)}`,
          finding.location ? `Location: ${finding.location}` : null,
          finding.disposition ? `Review: ${dispositionLabel[finding.disposition] ?? finding.disposition}` : null,
        ]
          .filter(Boolean)
          .join("   |   "),
        { size: 8.5, color: [100, 116, 139], indent: 10, gap: 5 },
      );
      writeParagraph(finding.detail, { size: 10, indent: 10, gap: 4 });
      if (finding.evidence) {
        writeParagraph("Evidence", { size: 8.5, style: "bold", color: [100, 116, 139], indent: 10, gap: 1 });
        writeParagraph(finding.evidence, { size: 9.5, style: "italic", color: [51, 65, 85], indent: 10, gap: 4 });
      }
      // Severity bar on the left of the block (only when it stayed on one page).
      if (doc.getNumberOfPages() === blockPage) doc.line(margin + 1, blockTop + 2, margin + 1, y - 4);
      y += 10;
    });
  }

  // --- Disclaimer ---
  ensureSpace(60);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  writeParagraph(
    "This report was generated automatically from the uploaded document using deterministic checks and AI-assisted review. Findings indicate areas requiring professional judgment and further investigation; they are not conclusions of fraud. Verify all findings against source records before relying on them.",
    { size: 8, color: [100, 116, 139] },
  );

  // --- Page footers ---
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(pdfText(`Detechtico - ${job.original_filename ?? "Forensic analysis"}`), margin, pageHeight - 28);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 28, { align: "right" });
  }

  doc.save(reportFilename(job));
}
