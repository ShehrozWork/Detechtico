import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About Us — Detechtico",
  description:
    "Learn about Detechtico — explainable financial statement analysis built for forensic transparency and trust.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <AboutContent />
      </main>
      <Footer />
    </>
  );
}
