import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LogoMark } from "@/components/ui/LogoMark";
import { JoinCTA } from "@/components/sections/JoinCTA";
import { footerColumns, legalLinks } from "@/data/footer";

const linkStyles =
  "text-sm text-primary-tint transition-colors hover:text-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-soft";

type FooterProps = {
  showJoin?: boolean;
};

export function Footer({ showJoin = true }: FooterProps) {
  return (
    <footer>
      {showJoin && <JoinCTA />}

      <div className="bg-footer text-primary-tint">
        <Container className="pb-0 pt-14.5">
          <div className="grid gap-x-10 gap-y-12 lg:grid-cols-2">
            <div>
              <Link href="/" className="flex items-center gap-2.5 text-white">
                <LogoMark size={40} />
                <span className="text-[25px] font-bold tracking-tight">
                  Detechtico
                </span>
              </Link>
              <p className="mt-5 max-w-[34ch] text-sm text-primary-tint/90">
                <b>Detechtico</b> — Explainable Financial Statement Analysis
              </p>

              <p className="mt-8 text-[15px] font-semibold text-white">
                Follow Us on
              </p>
              <div className="mt-4 flex gap-3.5">
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="grid h-9.5 w-9.5 place-items-center rounded-full bg-[#0d5a72] transition-colors hover:bg-[#127994]"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white">
                    <path d="M6.9 8.6H3.6V21h3.3ZM5.3 3a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9ZM21 13.9c0-3.4-1.8-5-4.3-5a3.7 3.7 0 0 0-3.3 1.8V8.6H10V21h3.3v-6.5c0-1.6.8-2.5 2.1-2.5s2 .9 2 2.5V21H21Z" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="grid h-9.5 w-9.5 place-items-center rounded-full bg-[#0d5a72] transition-colors hover:bg-[#127994]"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white">
                    <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9A3.1 3.1 0 1 1 12 8.9a3.1 3.1 0 0 1 0 6.2Zm6.3-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.2c-2.4 0-2.7 0-3.7.1-1 .1-1.7.2-2.3.5a4.7 4.7 0 0 0-1.7 1.1 4.7 4.7 0 0 0-1.1 1.7c-.3.6-.4 1.3-.5 2.3-.1 1-.1 1.3-.1 3.7s0 2.7.1 3.7c.1 1 .2 1.7.5 2.3a4.7 4.7 0 0 0 1.1 1.7 4.7 4.7 0 0 0 1.7 1.1c.6.3 1.3.4 2.3.5 1 .1 1.3.1 3.7.1s2.7 0 3.7-.1c1-.1 1.7-.2 2.3-.5a4.7 4.7 0 0 0 1.7-1.1 4.7 4.7 0 0 0 1.1-1.7c.3-.6.4-1.3.5-2.3.1-1 .1-1.3.1-3.7s0-2.7-.1-3.7c-.1-1-.2-1.7-.5-2.3a4.7 4.7 0 0 0-1.1-1.7 4.7 4.7 0 0 0-1.7-1.1c-.6-.3-1.3-.4-2.3-.5-1-.1-1.3-.1-3.7-.1Zm0 1.5c2.4 0 2.6 0 3.6.1.86.04 1.33.18 1.64.3.42.16.72.36 1.03.67.31.31.51.61.67 1.03.12.31.26.78.3 1.64.05.95.06 1.24.06 3.56s0 2.61-.06 3.56c-.04.86-.18 1.33-.3 1.64a2.8 2.8 0 0 1-.67 1.03 2.8 2.8 0 0 1-1.03.67c-.31.12-.78.26-1.64.3-.95.05-1.24.06-3.56.06s-2.61 0-3.56-.06c-.86-.04-1.33-.18-1.64-.3a2.8 2.8 0 0 1-1.03-.67 2.8 2.8 0 0 1-.67-1.03c-.12-.31-.26-.78-.3-1.64C5.2 14.61 5.2 14.32 5.2 12s0-2.61.06-3.56c.04-.86.18-1.33.3-1.64.16-.42.36-.72.67-1.03.31-.31.61-.51 1.03-.67.31-.12.78-.26 1.64-.3.95-.05 1.24-.06 3.56-.06Z" />
                  </svg>
                </a>
              </div>
            </div>

            <nav
              aria-label="Footer"
              className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
            >
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-sm font-medium tracking-[0.14em] text-primary-soft uppercase">
                    {column.title}
                  </h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className={linkStyles}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-13 flex flex-col items-start justify-between gap-5 border-t border-white/14 py-5.5 text-[13px] text-primary-tint/85 sm:flex-row sm:items-center">
            <span>&copy; Copyright {new Date().getFullYear()}.</span>
            <nav
              aria-label="Legal"
              className="flex flex-wrap items-center gap-5.5"
            >
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </Container>
      </div>
    </footer>
  );
}
