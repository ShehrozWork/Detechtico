export type ComparisonRow =
  | {
      feature: string;
      type: "check";
      detechtico: boolean;
      others: boolean;
    }
  | {
      feature: string;
      type: "price";
      detechtico: string;
      others: string;
    };

export const comparisonRows: ComparisonRow[] = [
  {
    feature: "Explains why financial anomalies are flagged",
    type: "check",
    detechtico: true,
    others: false,
  },
  {
    feature: "Customizable risk rules per industry",
    type: "check",
    detechtico: true,
    others: false,
  },
  {
    feature: "Learns from investigator feedback",
    type: "check",
    detechtico: true,
    others: false,
  },
  {
    feature: "Designed by a forensic accountant",
    type: "check",
    detechtico: true,
    others: false,
  },
  {
    feature: "Entry price",
    type: "price",
    detechtico: "$29.99/mo",
    others: "Enterprise quote",
  },
  {
    feature: "Audit-ready ML reports",
    type: "check",
    detechtico: true,
    others: false,
  },
];
