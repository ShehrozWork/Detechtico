export type PlatformFeature = {
  title: string;
  description: string;
  href: string;
};

export const platformFeatures: PlatformFeature[] = [
  {
    title: "Explainable AI Detection",
    description:
      'See exactly why each transaction is flagged with detailed reasoning, confidence scores, and contributing factors. No more "black box" mysteries—full forensic transparency.',
    href: "#technology",
  },
  {
    title: "Blockchain Security",
    description:
      "Implements blockchain technology and robust encryption protocols to ensure data integrity and protect sensitive financial information throughout the analysis process.",
    href: "#security",
  },
  {
    title: "Adaptive Intelligence",
    description:
      "Our system learns from your confirmations, overrides, and real-world patterns to continuously improve accuracy. It adapts to your industry's unique fraud indicators over time.",
    href: "#technology",
  },
  {
    title: "Automated Compliance",
    description:
      "Automatically generates compliance reports and maintains comprehensive audit trails to help organizations meet regulatory requirements efficiently.",
    href: "/how-it-works",
  },
  {
    title: "Real-Time Alerts",
    description:
      "Provides instant notifications when suspicious activities are detected, allowing financial institutions to respond quickly to potential fraud attempts.",
    href: "/how-it-works",
  },
  {
    title: "Cloud Architecture",
    description:
      "Cloud-based platform ensures scalability, real-time analysis capabilities, and secure accessibility from anywhere, allowing for immediate fraud response.",
    href: "#technology",
  },
];

export type TechnologyTopic = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
};

export const technologyTopics: TechnologyTopic[] = [
  {
    id: "ai-ml",
    title: "Advanced AI & Machine Learning",
    description:
      "Our proprietary AI algorithms analyze millions of financial transactions simultaneously to detect sophisticated fraud patterns that traditional methods miss.",
    benefits: [
      "Processes millions of transactions in real-time",
      "Self-learning system improves detection accuracy by 97% over time",
      "Reduces false positives by 85% compared to traditional methods",
    ],
  },
  {
    id: "distributed-db",
    title: "Distributed Database Architecture",
    description:
      "Our secure cloud infrastructure ensures maximum uptime and performance while maintaining the highest standards of data security and compliance.",
    benefits: [
      "99.99% uptime guarantee",
      "Automatic scaling during peak processing periods",
      "Geo-distributed redundancy prevents data loss",
    ],
  },
  {
    id: "blockchain",
    title: "Blockchain Ledger Security",
    description:
      "Cryptographically secure, immutable record-keeping ensures all financial data and analysis results remain tamper-proof and legally admissible.",
    benefits: [
      "SHA-256 encryption creates court-admissible audit trails",
      "Zero-knowledge proof verification protocols",
      "Distributed validator network prevents manipulation",
    ],
  },
  {
    id: "quantum",
    title: "Quantum-Resistant Encryption",
    description:
      "Future-proof security architecture designed to withstand quantum computing attacks on sensitive financial data and fraud detection systems.",
    benefits: [
      "Post-quantum cryptographic algorithms",
      "Multi-layered encryption protocols",
      "Secure cross-border data exchange compliant with international regulations",
    ],
  },
  {
    id: "behavioral",
    title: "Real-time Behavioral Analysis",
    description:
      "Continuous monitoring of transaction patterns identifies suspicious activity as it happens, enabling immediate intervention.",
    benefits: [
      "Millisecond latency between transaction and analysis",
      "Contextual user behavior profiling",
      "Adaptive threshold management reduces disruption to legitimate activities",
    ],
  },
];

export type WorkflowStep = {
  title: string;
  description: string;
};

export const workflowSteps: WorkflowStep[] = [
  {
    title: "Data Collection",
    description:
      "Financial transaction data is securely collected and encrypted using blockchain technology.",
  },
  {
    title: "AI Analysis",
    description:
      "Advanced AI and machine learning algorithms analyze the data to detect anomalies and suspicious patterns.",
  },
  {
    title: "Pattern Recognition",
    description:
      "Transactions are compared to known fraud patterns and regulatory requirements.",
  },
  {
    title: "Risk Assessment",
    description:
      "Each transaction is assigned a risk score based on multiple fraud indicators.",
  },
  {
    title: "Report Generation",
    description:
      "Detailed, encrypted reports are generated for financial institutions and auditors.",
  },
  {
    title: "Compliance Verification",
    description:
      "Data is verified against regulatory standards to ensure full compliance.",
  },
];

export const platformStats = [
  { value: "99.2%", label: "Detection Accuracy" },
  { value: "60%", label: "Fewer False Positives" },
  { value: "<5min", label: "Average Alert Response" },
];

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

export const testimonials: Testimonial[] = [
  {
    quote:
      "We switched from a legacy black-box system and caught 3x more suspicious transactions in the first month. The explainability factor is a game-changer for our audit team.",
    name: "",
    role: "",
  },
  {
    quote:
      "Detechtico gives our investigators the 'why' behind every flag. We've cut false positive review time by 60% and our regulators love the transparency.",
    name: "",
    role: "",
  },
  {
    quote:
      "As a forensic accountant, I need tools that show their work. Detechtico is the only platform that thinks like an investigator, not just a data scientist.",
    name: "",
    role: "",
  },
];

export type SecurityFeature = {
  title: string;
  description: string;
};

export const securityFeatures: SecurityFeature[] = [
  {
    title: "Document-Level Encryption",
    description:
      "Every financial document is encrypted with AES-256 encryption using unique document keys, ensuring complete protection of sensitive financial data at rest and in transit.",
  },
  {
    title: "Zero-Knowledge Architecture",
    description:
      "We cannot access your financial documents - all encryption happens client-side with keys that only you control, providing military-grade data protection.",
  },
  {
    title: "Real-time Integrity Monitoring",
    description:
      "Every document includes cryptographic checksums and integrity verification to detect any unauthorized modifications or tampering attempts.",
  },
  {
    title: "Comprehensive Audit Trails",
    description:
      "Complete audit logs track every document access, modification, and deletion with immutable timestamps for full regulatory compliance and forensic analysis.",
  },
  {
    title: "Advanced Threat Detection",
    description:
      "Multi-layered security monitoring detects suspicious access patterns, unauthorized attempts, and potential data exfiltration in real-time.",
  },
  {
    title: "Key Rotation & Management",
    description:
      "Automated encryption key rotation and secure key management ensures long-term data protection against evolving cryptographic threats.",
  },
];

export const securityStatuses = [
  { label: "Encryption", status: "Active" },
  { label: "Firewall", status: "Active" },
  { label: "Data Backup", status: "Active" },
  { label: "Compliance", status: "Active" },
];

export const securityCertifications = [
  { label: "GDPR", status: "Compliant" },
  { label: "PCI DSS", status: "Compliant" },
  { label: "SOC 2", status: "Compliant" },
];

export const securityLogs = [
  { message: "User authentication successful", time: "09:45 AM" },
  { message: "System security scan completed", time: "08:32 AM" },
  { message: "Encryption keys rotated", time: "Yesterday" },
];
