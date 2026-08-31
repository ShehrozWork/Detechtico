import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CareersContent } from "@/components/careers/CareersContent";

export const metadata: Metadata = {
  title: "Careers — Detechtico",
  description:
    "Join Detechtico and help build explainable financial statement analysis for forensic and compliance teams.",
};

export default function CareersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CareersContent />
      </main>
      <Footer />
    </>
  );
}
