import type { IconName } from "@/components/ui/Icon";

export type DashboardModule = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
};

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "layout",
  },
  {
    label: "Explainable AI",
    href: "/dashboard/explainable-ai",
    icon: "eye",
  },
  {
    label: "Risk Configuration",
    href: "/dashboard/risk-settings",
    icon: "sliders",
  },
  {
    label: "Adaptive Learning",
    href: "/dashboard/adaptive-learning",
    icon: "brain",
  },
  {
    label: "Network Analysis",
    href: "/dashboard/network-analysis",
    icon: "network",
  },
  {
    label: "Statement Analysis",
    href: "/financial-statement-analysis",
    icon: "file",
  },
];

export const dashboardModules: DashboardModule[] = [
  {
    title: "Explainable AI",
    description:
      "Inspect evidence, confidence, and rule IDs behind each forensic finding",
    href: "/dashboard/explainable-ai",
    icon: "eye",
  },
  {
    title: "Risk Configuration",
    description: "Customize detection thresholds and rules for your use case",
    href: "/dashboard/risk-settings",
    icon: "sliders",
  },
  {
    title: "Adaptive Learning",
    description: "Track how the system learns and improves from your feedback",
    href: "/dashboard/adaptive-learning",
    icon: "brain",
  },
  {
    title: "Network & Shell Detection",
    description: "Map vendor relationships and detect shell company patterns",
    href: "/dashboard/network-analysis",
    icon: "network",
  },
  {
    title: "Statement Analysis",
    description:
      "Forensic analysis of balance sheets, income & cash flow statements",
    href: "/financial-statement-analysis",
    icon: "file",
  },
];

export type WorkspaceTab = "import" | "transactions" | "fraud";

export const workspaceTabs: { id: WorkspaceTab; label: string }[] = [
  { id: "import", label: "Import" },
  { id: "transactions", label: "Transactions" },
  { id: "fraud", label: "Fraud Detection" },
];

export const recentImports = [
  {
    name: "transactions_q3_2024.csv",
    records: 1248,
    importedAt: "Aug 10, 2024",
  },
  {
    name: "vendor_payments.xlsx",
    records: 386,
    importedAt: "Aug 8, 2024",
  },
  {
    name: "wire_transfers_july.json",
    records: 92,
    importedAt: "Aug 2, 2024",
  },
];

export type ReviewStatus = "flagged" | "review" | "clear";

export type RiskFactor = {
  title: string;
  impact: number;
  description: string;
  icon: IconName;
};

export type ReviewTransaction = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  location: string;
  status: ReviewStatus;
  riskScore: number;
  explanation: string;
  factors: RiskFactor[];
};

export const reviewTransactions: ReviewTransaction[] = [
  {
    id: "TXN-001-2024",
    merchant: "International Electronics Ltd",
    amount: 4850,
    currency: "USD",
    date: "Aug 11, 2024",
    time: "3:42 AM",
    location: "Singapore",
    status: "flagged",
    riskScore: 87,
    explanation:
      "This transaction was flagged due to unusual characteristics including a high amount from a new merchant, conducted during off-hours, and originating from a foreign location that doesn't match the user's typical pattern.",
    factors: [
      {
        title: "Unusual Transaction Time",
        impact: 25,
        description:
          "Transaction occurred at 3:42 AM, outside normal business hours and user's typical activity window",
        icon: "clock",
      },
      {
        title: "High Transaction Amount",
        impact: 30,
        description:
          "Amount of $4,850 is 320% above user's average transaction size",
        icon: "banknote",
      },
      {
        title: "New Merchant",
        impact: 20,
        description:
          "First transaction with this merchant; no previous history",
        icon: "store",
      },
      {
        title: "Geographic Anomaly",
        impact: 12,
        description:
          "Transaction location (Singapore) doesn't match user's typical locations (US-based)",
        icon: "globe",
      },
    ],
  },
  {
    id: "TXN-002-2024",
    merchant: "Northside Facilities Group",
    amount: 1875,
    currency: "USD",
    date: "Aug 9, 2024",
    time: "6:18 PM",
    location: "Chicago, US",
    status: "review",
    riskScore: 61,
    explanation:
      "This payment sits above the medium-risk threshold. The vendor is known, but the amount and timing deviate from the usual monthly facilities cycle.",
    factors: [
      {
        title: "Amount Variance",
        impact: 22,
        description:
          "Invoice is 48% higher than the trailing six-month average for this vendor",
        icon: "banknote",
      },
      {
        title: "Timing Drift",
        impact: 18,
        description:
          "Posted on a Saturday evening rather than the usual mid-month weekday window",
        icon: "clock",
      },
      {
        title: "Partial Invoice Match",
        impact: 14,
        description:
          "PO reference is present but does not fully match the billed line items",
        icon: "alert",
      },
    ],
  },
  {
    id: "TXN-003-2024",
    merchant: "Office Depot Business",
    amount: 214.5,
    currency: "USD",
    date: "Aug 7, 2024",
    time: "11:04 AM",
    location: "Erie, PA",
    status: "clear",
    riskScore: 18,
    explanation:
      "Routine supply purchase from a trusted merchant during business hours, within normal amount ranges and a known US location.",
    factors: [
      {
        title: "Known Merchant",
        impact: -8,
        description: "Vendor has a clean 14-month history with this account",
        icon: "store",
      },
      {
        title: "Typical Amount",
        impact: -6,
        description: "Well within the usual $80–$260 office supply range",
        icon: "banknote",
      },
    ],
  },
];

export const ledgerTransactions = [
  ...reviewTransactions,
  {
    id: "TXN-004-2024",
    merchant: "AWS Cloud Services",
    amount: 642.1,
    currency: "USD",
    date: "Aug 6, 2024",
    status: "clear" as ReviewStatus,
    riskScore: 12,
  },
  {
    id: "TXN-005-2024",
    merchant: "Legal Partners LLC",
    amount: 9200,
    currency: "USD",
    date: "Aug 5, 2024",
    status: "flagged" as ReviewStatus,
    riskScore: 82,
  },
  {
    id: "TXN-006-2024",
    merchant: "Quality Office Supply Co.",
    amount: 8800,
    currency: "USD",
    date: "Aug 4, 2024",
    status: "flagged" as ReviewStatus,
    riskScore: 78,
  },
];

export type DetectionRule = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

export type RiskSettings = {
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  amountAlert: number;
  rules: DetectionRule[];
};

export const defaultRiskSettings: RiskSettings = {
  highRiskThreshold: 75,
  mediumRiskThreshold: 50,
  amountAlert: 1000,
  rules: [
    {
      id: "velocity",
      title: "Velocity Checks",
      description: "Monitor frequency and speed of transactions",
      enabled: true,
    },
    {
      id: "geo",
      title: "Geolocation Analysis",
      description: "Flag transactions from unusual locations",
      enabled: true,
    },
    {
      id: "time",
      title: "Time Pattern Analysis",
      description: "Detect anomalies in transaction timing",
      enabled: true,
    },
    {
      id: "merchant",
      title: "Merchant Verification",
      description: "Cross-reference with trusted merchant database",
      enabled: true,
    },
  ],
};

export type LearningMetric = {
  title: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  description: string;
};

export const learningMetrics: LearningMetric[] = [
  {
    title: "Detection Accuracy",
    value: "94.5%",
    delta: "+2.3%",
    deltaPositive: true,
    description: "Overall accuracy in identifying fraud",
  },
  {
    title: "False Positive Rate",
    value: "3.2%",
    delta: "-1.1%",
    deltaPositive: true,
    description: "Legitimate transactions incorrectly flagged",
  },
  {
    title: "Pattern Recognition",
    value: "89.7%",
    delta: "+4.5%",
    deltaPositive: true,
    description: "Ability to identify fraud patterns",
  },
  {
    title: "Adaptive Improvement",
    value: "91.2%",
    delta: "+3.8%",
    deltaPositive: true,
    description: "Learning rate from user feedback",
  },
];

export type LearningEvent = {
  title: string;
  source: string;
  adjustment: string;
};

export const learningEvents: LearningEvent[] = [
  {
    title: "High-value international transactions",
    source: "User approved 8 similar transactions",
    adjustment: "Reduced risk score by 15% for this pattern",
  },
  {
    title: "Weekend e-commerce purchases",
    source: "User rejected 5 similar transactions",
    adjustment: "Increased risk score by 20% for this pattern",
  },
  {
    title: "Multiple small transactions",
    source: "System detected velocity pattern",
    adjustment: "New rule created for rapid succession",
  },
];

export type NetworkVendor = {
  id: string;
  name: string;
  shortName: string;
  risk: number;
  transactions: number;
  x: number;
  y: number;
};

export const networkVendors: NetworkVendor[] = [
  {
    id: "legal",
    name: "Payment to Legal Partners LLC",
    shortName: "Legal Partners",
    risk: 82,
    transactions: 3,
    x: 320,
    y: 78,
  },
  {
    id: "quality",
    name: "Payment to Quality Office Supply Co.",
    shortName: "Quality Office",
    risk: 78,
    transactions: 3,
    x: 118,
    y: 220,
  },
  {
    id: "metro",
    name: "Payment to Metro Supplies",
    shortName: "Metro Supplies",
    risk: 78,
    transactions: 2,
    x: 522,
    y: 220,
  },
  {
    id: "global",
    name: "Payment to Global Services",
    shortName: "Global Services",
    risk: 65,
    transactions: 2,
    x: 320,
    y: 348,
  },
];

export const networkStats = [
  { value: "4", label: "Unique Vendors" },
  { value: "6", label: "Connections Found" },
  { value: "1", label: "Suspicious Clusters" },
];

export type VendorConnection = {
  from: string;
  to: string;
  reasons: string[];
};

export const vendorConnections: VendorConnection[] = [
  {
    from: "Payment to Legal Partners LLC",
    to: "Payment to Quality Office Supply Co.",
    reasons: [
      "Similar transaction amounts",
      "Both high-risk vendors",
      "Both flagged for fraud",
    ],
  },
  {
    from: "Payment to Legal Partners LLC",
    to: "Payment to Metro Supplies",
    reasons: [
      "Similar transaction amounts",
      "Both high-risk vendors",
      "Both flagged for fraud",
    ],
  },
  {
    from: "Payment to Legal Partners LLC",
    to: "Payment to Global Services",
    reasons: ["Similar transaction amounts", "Both high-risk vendors"],
  },
  {
    from: "Payment to Quality Office Supply Co.",
    to: "Payment to Metro Supplies",
    reasons: [
      "Similar transaction amounts",
      "Both high-risk vendors",
      "Both flagged for fraud",
    ],
  },
  {
    from: "Payment to Quality Office Supply Co.",
    to: "Payment to Global Services",
    reasons: ["Similar transaction amounts", "Both high-risk vendors"],
  },
  {
    from: "Payment to Metro Supplies",
    to: "Payment to Global Services",
    reasons: ["Similar transaction amounts", "Both high-risk vendors"],
  },
];

export const vendorClusters = [
  {
    id: "cluster-1",
    title: "Cluster 1",
    vendorCount: 4,
    vendors: [
      { name: "Payment to Legal Partners LLC", risk: 82 },
      { name: "Payment to Quality Office Supply Co.", risk: 78 },
      { name: "Payment to Metro Supplies", risk: 78 },
      { name: "Payment to Global Services", risk: 65 },
    ],
  },
];

export type StatementType = "balance-sheet" | "income" | "cash-flow";

export const statementTypes: { id: StatementType; label: string }[] = [
  { id: "balance-sheet", label: "Balance Sheet" },
  { id: "income", label: "Income Statement" },
  { id: "cash-flow", label: "Cash Flow" },
];

export const statementFindings = [
  {
    title: "Round-dollar vendor payments",
    detail:
      "Four consecutive payments of exactly $9,200 with no invoice remainder — a common shell-company tell.",
    severity: "High" as const,
  },
  {
    title: "Operating expense spike",
    detail:
      "Professional services rose 42% quarter-over-quarter without a matching revenue increase.",
    severity: "High" as const,
  },
  {
    title: "Related-party concentration",
    detail:
      "Legal Partners LLC and Global Services share an address hash and similar settlement timing.",
    severity: "Medium" as const,
  },
];

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
