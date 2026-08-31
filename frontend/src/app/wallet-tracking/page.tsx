import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WalletTrackingContent } from "@/components/wallet-tracking/WalletTrackingContent";

export const metadata: Metadata = {
  title: "Wallet Tracking — Detechtico",
  description:
    "Wallet tracking is coming soon to Detechtico — forensic clarity for monitoring wallet activity.",
};

export default function WalletTrackingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <WalletTrackingContent />
      </main>
      <Footer />
    </>
  );
}
