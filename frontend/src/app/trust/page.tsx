import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TrustContent } from "@/components/trust/TrustContent";

export const metadata: Metadata = {
  title: "Trust & Security — Detechtico",
  description:
    "How Detechtico protects your data, who can access it, and the controls we have in place across the platform.",
};

export default function TrustPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <TrustContent />
      </main>
      <Footer />
    </>
  );
}
