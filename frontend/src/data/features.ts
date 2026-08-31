export type Feature = {
  title: string;
  description: string;
  icon: "eye" | "sliders" | "brain" | "shield" | "file" | "bell";
};

export const features: Feature[] = [
  {
    title: "See why anomalies are flagged",
    description:
      "Every alert comes with detailed reasoning, confidence scores, and contributing factors across your financial statements. No more guessing.",
    icon: "eye",
  },
  {
    title: "Rules you control",
    description:
      "Set your own risk thresholds and enable checks for unusual variances, related-party activity, and accounting anomalies — tailored to your industry.",
    icon: "sliders",
  },
  {
    title: "ML that learns from you",
    description:
      "Confirm or override decisions and the system adapts. Your expertise makes the analysis smarter over time.",
    icon: "brain",
  },
  {
    title: "Forensic-grade security",
    description:
      "Built by a forensic accountant with end-to-end encryption, RLS policies, and SOC 2-aligned architecture.",
    icon: "shield",
  },
  {
    title: "Audit-ready reports",
    description:
      "Generate detailed PDF reports from ML analysis results — ready for regulators, auditors, or internal review.",
    icon: "file",
  },
  {
    title: "Real-time alerts",
    description:
      "Get instant notifications when suspicious patterns emerge in your statements. Catch irregularities before they escalate.",
    icon: "bell",
  },
];
