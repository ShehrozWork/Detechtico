import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlatformHero } from "@/components/platform/PlatformHero";
import { PlatformFeatures } from "@/components/platform/PlatformFeatures";
import { PlatformTechnology } from "@/components/platform/PlatformTechnology";
import { PlatformWorkflow } from "@/components/platform/PlatformWorkflow";
import { PlatformTestimonials } from "@/components/platform/PlatformTestimonials";
import { PlatformSecurity } from "@/components/platform/PlatformSecurity";
import { PricingPlans } from "@/components/sections/PricingPlans";
import { PlatformEnterprise } from "@/components/platform/PlatformEnterprise";
import { PlatformContact } from "@/components/platform/PlatformContact";

export const metadata: Metadata = {
  title: "Platform — Detechtico",
  description:
    "Explainable fraud detection with forensic-grade transparency, adaptive AI, and bank-grade security from Detechtico.",
};

export default function PlatformPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <PlatformHero />
        <PlatformFeatures />
        <PlatformTechnology />
        <PlatformWorkflow />
        <PlatformTestimonials />
        <PlatformSecurity />
        <PricingPlans
          variant="platform"
          title="Choose the Right Plan for Your Organization"
          description="Subscribe to access all features including our secure sign-in and registration system."
        />
        <PlatformEnterprise />
        <PlatformContact />
      </main>
      <Footer />
    </>
  );
}
