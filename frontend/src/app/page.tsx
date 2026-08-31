import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Trust } from "@/components/sections/Trust";
import { Features } from "@/components/sections/Features";
import { Comparison } from "@/components/sections/Comparison";
import { JoinCTA } from "@/components/sections/JoinCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Trust />
        <Features />
        <Comparison />
        <JoinCTA />
      </main>
      <Footer showJoin={false} />
    </>
  );
}
