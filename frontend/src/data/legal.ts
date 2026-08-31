export type LegalSection = {
  title: string;
  body: string;
};

export type LegalPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const privacyContent: LegalPageContent = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  description:
    "This Privacy Policy explains how Detechtico collects, uses, stores, and shares information when you use our website and platform.",
  lastUpdated: "July 29, 2026",
  sections: [
    {
      title: "Who we are",
      body: "Detechtico provides explainable financial statement analysis and fraud-detection tools. For privacy questions, contact detechtico@gmail.com. For security-related reports, contact security@detechtico.com.",
    },
    {
      title: "Information we collect",
      body: "We collect account information such as your name, email address, and company details when you register or contact us. We also collect usage data related to how you interact with the platform, subscription and billing status, and financial documents or transaction data you upload for analysis.",
    },
    {
      title: "How we use information",
      body: "We use your information to provide and improve the Detechtico platform, authenticate users, manage subscriptions and trials, deliver analysis results, send service-related communications, and maintain security, fraud prevention, and audit integrity across the product.",
    },
    {
      title: "Uploaded financial documents",
      body: "Uploaded financial documents and related records are processed only to deliver the analysis you request. They are not sold, and they are not used to train third-party models. You may delete uploaded files and transactions from the dashboard at any time, subject to any retention needed for legal, security, or billing records.",
    },
    {
      title: "Legal bases for processing",
      body: "Where applicable law requires a legal basis, we process personal data to perform our contract with you, to pursue legitimate interests such as securing and improving the service, to comply with legal obligations, and, where required, based on your consent.",
    },
    {
      title: "Sharing of information",
      body: "We do not sell personal data. We may share information with service providers that help us operate the platform (such as hosting, document analysis via the Anthropic API, and payment processors), with professional advisors when needed, or when required by law, regulation, or legal process. Analysis processors are instructed not to use uploaded documents to train their models.",
    },
    {
      title: "Data retention",
      body: "We retain personal data only as long as needed for the purposes described in this policy, including providing the service, meeting legal and accounting requirements, resolving disputes, and enforcing our agreements. When data is no longer required, we delete or anonymize it where reasonably practicable.",
    },
    {
      title: "Security",
      body: "We apply administrative, technical, and organizational measures designed to protect personal data, including encryption in transit and at rest, access controls, and authenticated API checks. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. Additional details are available on our Trust & Security page.",
    },
    {
      title: "Your rights",
      body: "Depending on your location, you may have rights to access, correct, delete, or export your personal data, object to or restrict certain processing, and withdraw consent where processing is consent-based. To exercise these rights, email detechtico@gmail.com. We may need to verify your identity before fulfilling a request.",
    },
    {
      title: "International transfers",
      body: "If personal data is processed or stored in countries other than where you live, we take steps intended to ensure an appropriate level of protection consistent with applicable law.",
    },
    {
      title: "Children’s privacy",
      body: "Detechtico is intended for business and professional use and is not directed to children. We do not knowingly collect personal information from children under 16.",
    },
    {
      title: "Changes to this policy",
      body: "We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page will change when we do. Continued use of the service after an update means you acknowledge the revised policy.",
    },
    {
      title: "Contact",
      body: "For privacy requests or questions about this policy, contact detechtico@gmail.com. For vulnerability reports or security documentation requests, contact security@detechtico.com.",
    },
  ],
};

export const termsContent: LegalPageContent = {
  eyebrow: "Legal",
  title: "Terms of Service",
  description:
    "These Terms of Service govern access to and use of the Detechtico website, platform, and related services.",
  lastUpdated: "July 29, 2026",
  sections: [
    {
      title: "Agreement to these terms",
      body: "By accessing or using Detechtico, you agree to these Terms of Service and our Privacy Policy. If you are using the service on behalf of an organization, you represent that you have authority to bind that organization to these terms.",
    },
    {
      title: "The service",
      body: "Detechtico provides software tools for financial statement analysis, anomaly detection, and related workflow features. Outputs are intended to support professional judgment. They are not a substitute for independent forensic, legal, accounting, or compliance advice.",
    },
    {
      title: "Accounts and eligibility",
      body: "You must provide accurate account information and keep credentials confidential. You are responsible for activity under your account. You must be able to form a binding contract and use the service only for lawful business purposes.",
    },
    {
      title: "Subscriptions, trials, and billing",
      body: "Paid plans, free trials, and pricing are described on our subscribe pages or in an order form. Fees are billed according to the selected plan. Unless otherwise stated, subscriptions renew automatically until canceled. Taxes may apply. Failure to maintain an active subscription or trial may limit access to paid features.",
    },
    {
      title: "Acceptable use",
      body: "You may not misuse the service, attempt unauthorized access, interfere with platform integrity, reverse engineer protected components except where law permits, upload unlawful or infringing content, or use Detechtico to harm others or violate applicable financial, privacy, or export laws.",
    },
    {
      title: "Your content",
      body: "You retain ownership of documents and data you upload. You grant Detechtico a limited license to host, process, and display that content solely to provide the service you request. You represent that you have the rights needed to upload and process that content through the platform.",
    },
    {
      title: "Intellectual property",
      body: "Detechtico and its licensors own the platform, software, branding, and related intellectual property. Except for the limited right to use the service under these terms, no rights are transferred to you.",
    },
    {
      title: "Confidentiality",
      body: "Each party may receive confidential information from the other. The receiving party will use that information only as needed to perform under these terms and will protect it with reasonable care, except for information that is public, independently developed, or required to be disclosed by law.",
    },
    {
      title: "Third-party services",
      body: "The platform may rely on third-party infrastructure and services, including authentication, hosting, and payment providers. Your use of those services may also be subject to their terms. Detechtico is not responsible for third-party services outside our reasonable control.",
    },
    {
      title: "Disclaimers",
      body: "The service is provided on an “as is” and “as available” basis. To the fullest extent permitted by law, Detechtico disclaims warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that analysis results will be error-free, complete, or suitable for any specific regulatory filing or investigation outcome.",
    },
    {
      title: "Limitation of liability",
      body: "To the fullest extent permitted by law, Detechtico will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, goodwill, or data. Our aggregate liability arising out of these terms or the service will not exceed the amounts you paid to Detechtico for the service in the twelve months before the claim.",
    },
    {
      title: "Indemnification",
      body: "You will defend and indemnify Detechtico against claims arising from your content, your misuse of the service, or your violation of these terms or applicable law, except to the extent caused by our willful misconduct.",
    },
    {
      title: "Suspension and termination",
      body: "We may suspend or terminate access if you breach these terms, create security or legal risk, or fail to pay applicable fees. You may stop using the service at any time. Provisions that by nature should survive termination will survive, including ownership, disclaimers, limitations of liability, and indemnity.",
    },
    {
      title: "Changes",
      body: "We may update these Terms of Service from time to time. The “Last updated” date will change when we do. If a change is material, we will provide reasonable notice where practicable. Continued use after the effective date constitutes acceptance of the updated terms.",
    },
    {
      title: "Governing law",
      body: "These terms are governed by the laws applicable in Erie, PA, without regard to conflict-of-law principles, unless mandatory local consumer law provides otherwise.",
    },
    {
      title: "Contact",
      body: "For questions about these Terms of Service, contact detechtico@gmail.com. For security concerns, contact security@detechtico.com.",
    },
  ],
};
