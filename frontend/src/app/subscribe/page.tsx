import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PricingPlans } from "@/components/sections/PricingPlans";

export const metadata: Metadata = {
  title: "Subscribe — Detechtico",
  description:
    "Select a Detechtico subscription plan to access sign-in, registration, and the full dashboard.",
};

export default function SubscribePage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-primary-tint/40">
        <PricingPlans />
      </main>
      <Footer />
    </>
  );
}
