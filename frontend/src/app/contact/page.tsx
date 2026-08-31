import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlatformContact } from "@/components/platform/PlatformContact";

export const metadata: Metadata = {
  title: "Contact — Detechtico",
  description:
    "Get in touch with Detechtico about fraud detection, financial statement analysis, and enterprise solutions.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <PlatformContact />
      </main>
      <Footer />
    </>
  );
}
