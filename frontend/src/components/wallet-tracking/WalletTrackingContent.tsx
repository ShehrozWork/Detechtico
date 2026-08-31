import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import ArrowRight from "@/app/icons/arrow-right";

export function WalletTrackingContent() {
  return (
    <header className="flex min-h-[calc(100vh-8rem)] items-center py-12 sm:py-16 lg:py-22">
      <Container>
        <div className="mx-auto max-w-[40rem] text-center">
          <h1 className="text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
            Wallet tracking
          </h1>
          <p className="mt-3 text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
            Coming soon
          </p>
          <div className="mt-8">
            <Button
              href="/contact"
              className="bg-primary text-white hover:bg-primary-hover"
            >
              Get notified
              <ArrowRight className="w-6 text-white" />
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}
