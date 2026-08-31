export type TrustSection = {
  title: string;
  body: string;
};

export const trustIntro = {
  title: "Trust & Security",
  description:
    "How Detechtico protects your data, who can access it, and the controls we have in place across the platform.",
  lastUpdated: "August 18, 2026",
};

export const trustSections: TrustSection[] = [
  {
    title: "Our security philosophy",
    body: "Detechtico handles sensitive financial data, so security is the default — not an add-on. We follow least-privilege, defense-in-depth, and secure-by-default principles across the product and infrastructure.",
  },
  {
    title: "Data encryption",
    body: "All data is encrypted in transit with TLS 1.2+ in production. Data at rest in our managed Postgres database uses the provider’s disk encryption (AES-256). Uploaded documents are stored outside the database with randomized filenames; original names are kept only as metadata.",
  },
  {
    title: "Access control & isolation",
    body: "The API authenticates every request and scopes document, job, and finding queries to the signed-in user. Postgres row-level security is also enabled and forced on those tables so a missing application filter cannot return another customer’s analysis records. Passwords are stored as Argon2 hashes.",
  },
  {
    title: "Authentication",
    body: "User authentication is implemented in our FastAPI backend with email/password accounts. Short-lived access JWTs and rotating refresh tokens are stored in HttpOnly cookies, not localStorage. Sensitive endpoints validate the session server-side before performing work.",
  },
  {
    title: "Backend & API security",
    body: "Business logic runs in the Python API with explicit CORS allowlists, origin checks on mutating requests, upload type detection from file content, size limits, and rate limiting on authentication and analysis. Anthropic keys never leave the server.",
  },
  {
    title: "Privacy",
    body: "We collect only the data needed to provide fraud-detection insights. We do not sell personal data. Uploaded financial documents are processed for the analysis you request and are not used to train third-party models. You can delete your uploaded files and transactions from the dashboard at any time.",
  },
  {
    title: "Compliance posture",
    body: "Detechtico aligns its controls with widely recognized frameworks including SOC 2 principles, GDPR data-subject rights, and PCI-DSS guidance for payment-related data handling. This page reflects our current internal posture and is not a substitute for an independent audit report.",
  },
  {
    title: "Reporting a vulnerability",
    body: "If you believe you have found a security vulnerability, please email security@detechtico.com with steps to reproduce. We will acknowledge your report within 3 business days and keep you updated as we investigate and remediate.",
  },
  {
    title: "Disclosures",
    body: "This trust page is published and maintained by Detechtico. It describes our internal practices and is not an independent certification or attestation. For questions about our controls, data processing agreements, or to request a copy of our security documentation, contact security@detechtico.com.",
  },
];
