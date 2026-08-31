export type CareerRole = {
  title: string;
  location: string;
  type: string;
  description: string;
};

export type CareerValue = {
  title: string;
  description: string;
};

export const careerValues: CareerValue[] = [
  {
    title: "Explainability is the product",
    description:
      "We hire people who care as much about why a finding exists as whether the model caught it.",
  },
  {
    title: "Practitioner-led thinking",
    description:
      "Forensic, compliance, and investigation expertise shape how we build — not just how we market.",
  },
  {
    title: "High trust, low theater",
    description:
      "Small team, direct ownership, and work that has to stand up under real audit pressure.",
  },
];

export const careerPerks: CareerValue[] = [
  {
    title: "Remote-friendly",
    description:
      "Work from where you do your best thinking, with Newark, DE as our home base.",
  },
  {
    title: "Meaningful scope",
    description:
      "Ship features and investigations workflows that financial institutions actually rely on.",
  },
  {
    title: "Cross-disciplinary team",
    description:
      "Collaborate with ML, product, and forensic specialists on the same problems.",
  },
];

export const careerRoles: CareerRole[] = [
  {
    title: "Senior Machine Learning Engineer",
    location: "Remote · Erie, PA",
    type: "Full-time",
    description:
      "Build and improve models that surface financial statement anomalies with explainable, auditor-ready outputs.",
  },
  {
    title: "Forensic Accounting Specialist",
    location: "Remote · Erie, PA",
    type: "Full-time",
    description:
      "Partner with product and engineering to encode forensic review logic, red-flag heuristics, and compliance workflows.",
  },
  {
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    description:
      "Design clear investigation experiences for analysts, auditors, and compliance teams reviewing flagged statements.",
  },
  {
    title: "Customer Success Manager",
    location: "Remote",
    type: "Full-time",
    description:
      "Help financial institutions adopt Detechtico, run evaluations, and turn forensic insights into lasting process change.",
  },
];
