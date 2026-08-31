import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { termsContent } from "@/data/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Detechtico",
  description:
    "Terms governing access to and use of the Detechtico website, platform, and related services.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <LegalDocument content={termsContent} />
      </main>
      <Footer />
    </>
  );
}
