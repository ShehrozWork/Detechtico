import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlatformWorkflow } from "@/components/platform/PlatformWorkflow";

export const metadata: Metadata = {
  title: "How It Works — Detechtico",
  description:
    "See how Detechtico collects data, runs AI analysis, recognizes patterns, assesses risk, and generates compliance-ready reports.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <PlatformWorkflow />
      </main>
      <Footer />
    </>
  );
}
