import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { privacyContent } from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Detechtico",
  description:
    "How Detechtico collects, uses, stores, and shares information when you use our website and platform.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <LegalDocument content={privacyContent} />
      </main>
      <Footer />
    </>
  );
}
