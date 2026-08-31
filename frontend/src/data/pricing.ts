export type BillingPeriod = "monthly" | "annual";

export type PricingPlan = {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
  prices: Record<BillingPeriod, string>;
  features: string[];
  cta: { label: string; href: string; trial?: boolean };
  secondaryCta?: { label: string; href: string; trial?: boolean };
  platformCta?: { label: string; href: string; trial?: boolean };
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "essential",
    name: "Essential",
    tagline: "Explainable fraud detection for small teams",
    prices: {
      monthly: "$29.99",
      annual: "$299",
    },
    features: [
      "Basic fraud detection algorithms",
      "Up to 10,000 transactions per month",
      "Standard encryption",
      "Email support",
      "Weekly reports",
      "30-day data retention",
    ],
    cta: { label: "Subscribe Now", href: "/subscribe" },
    platformCta: { label: "Get Started", href: "/subscribe" },
    secondaryCta: { label: "Start 3-Day Free Trial", href: "/subscribe", trial: true },
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Customizable AI with adaptive learning",
    popular: true,
    prices: {
      monthly: "$49.99",
      annual: "$499",
    },
    features: [
      "Advanced fraud detection algorithms",
      "Up to 50,000 transactions per month",
      "Enhanced encryption protocols",
      "Priority email & phone support",
      "Daily reports with custom alerts",
      "90-day data retention",
      "API integration",
      "Custom dashboards",
    ],
    cta: { label: "Subscribe Now", href: "/subscribe" },
    platformCta: { label: "Free Trial", href: "/subscribe", trial: true },
    secondaryCta: { label: "Start 3-Day Free Trial", href: "/subscribe", trial: true },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Forensic-grade transparency & full control",
    prices: {
      monthly: "$89.99",
      annual: "$899",
    },
    features: [
      "Premium fraud detection system",
      "Unlimited transactions",
      "Military-grade encryption",
      "24/7 dedicated support",
      "Real-time monitoring & alerts",
      "1-year data retention",
      "Advanced API integration",
      "Custom compliance reports",
      "Dedicated account manager",
      "On-premise deployment option",
    ],
    cta: { label: "Contact Sales", href: "mailto:detechtico@gmail.com" },
  },
];
