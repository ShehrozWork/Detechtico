import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import ArrowRight from "@/app/icons/arrow-right";

export function PlatformHero() {
  return (
    <header id="overview" className="bg-primary-tint py-10.5">
      <Container>
        <div
          className="grid grid-cols-1 items-center gap-12 overflow-hidden rounded-[22px] px-7.5 py-14 sm:px-14 sm:py-18 lg:grid-cols-2 lg:gap-8"
          style={{
            background:
              "radial-gradient(120% 120% at 78% 38%, #2bb0d2 0%, #0c86a8 42%, #08536b 68%, #04303f 100%)",
          }}
        >
          {/* Left Side: Copy & Calls to Action */}
          <div className="flex flex-col">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary-soft uppercase">
              Advanced Forensic Software
            </p>
            <h1 className="mt-4 max-w-[18ch] text-4xl sm:text-5xl font-light leading-[1.22] tracking-[-0.5px] text-white">
              Explainable <b className="font-bold">Fraud Detection</b> You Can
              Trust
            </h1>
            <p className="mt-5.5 max-w-[54ch] text-lg font-light leading-[1.85] text-primary-tint">
              Unlike traditional &quot;black box&quot; tools,{" "}
              <b className="font-bold text-white">Detechtico</b> shows you
              exactly why transactions are flagged. Customize rules, adjust
              thresholds, and leverage forensic-grade transparency designed by a
              forensic accountant.
            </p>
            <div className="mt-8.5 flex flex-wrap gap-3.5">
              <Button
                href="/contact"
                className="rounded-[10px]! px-7.5! py-3.5! text-[17px]!"
              >
                Request Demo
                <ArrowRight className="w-6" fill="#fff" />
              </Button>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/55 px-7.5 py-3.5 text-[17px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Right Side: Platform Graphic / Mockup */}
          <div className="relative flex w-full flex-col rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md h-[320px] sm:h-[400px]">
            {/* Mockup Window Header */}
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/10 px-4 py-3 rounded-t-xl">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
            </div>

            {/* Mockup Body Content - Replace with your actual image/UI later */}
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              {/* 
                 TODO: Drop your platform screenshot or Next.js <Image /> here 
                 Example: 
                 <Image src="/platform-screenshot.png" alt="Detechtico Platform" fill className="object-cover rounded-b-xl" />
               */}
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-white/10 p-4">
                  <svg
                    className="w-8 h-8 text-white/70"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/60">
                  Platform Interface Placeholder
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
