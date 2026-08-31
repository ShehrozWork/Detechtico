import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FAQ } from "@/components/sections/FAQ";

export const metadata: Metadata = {
  title: "FAQs — Detechtico",
  description:
    "Answers to common questions about Detechtico, integrations, trials, and financial statement analysis.",
};

export default function FaqsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
