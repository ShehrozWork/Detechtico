export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "How long does integration take?",
    answer:
      "Integration takes just minutes. Connect Detechtico through our secure API or import your financial records, including bank statements, transaction data, and accounting records. Once your data is received, our machine learning begins analyzing it immediately, generating fraud detection insights and anomaly reports within minutes.",
  },
  {
    question: "Can we test it on historical data first?",
    answer:
      "Yes. Detechtico can analyze historical financial statements and transaction data, allowing you to validate its fraud detection capabilities, compare results against known outcomes, and build confidence before using it on live financial records.",
  },
  {
    question: "Where is our data stored?",
    answer:
      "Your data is stored in secure, encrypted cloud infrastructure with industry-standard security controls. Detechtico encrypts data both in transit and at rest, and access is restricted to authorized users. We are committed to maintaining the confidentiality and integrity of your financial data throughout the analysis process.",
  },
  {
    question: "Do we have to accept the model's decision?",
    answer:
      "No. Every verdict can be overridden by an investigator, and that override is exactly what trains the next model build. The system is designed to defer to your team, not replace it.",
  },
  {
    question: "What happens when the trial period ends?",
    answer:
      "At the end of the trial period, your team determines the best next step. If Detechtico meets your needs, you can continue using the platform with a subscription plan. If adjustments are needed, we can refine the setup based on your feedback and requirements. The trial is designed to help you evaluate how Detechtico fits into your fraud detection and investigation workflow before making a long-term commitment.",
  },
];
