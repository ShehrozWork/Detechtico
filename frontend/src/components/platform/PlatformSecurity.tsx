import { Container } from "@/components/ui/Container";
import {
  securityCertifications,
  securityFeatures,
  securityLogs,
  securityStatuses,
} from "@/data/platform";

export function PlatformSecurity() {
  return (
    <section id="security" className="bg-canvas py-16 sm:py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Left Column: Content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-primary"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[12px] font-semibold tracking-wider text-primary uppercase">
                Bank-Grade Security
              </span>
            </div>

            <h2 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:leading-[1.1]">
              Your Financial Data Protected with Advanced Security
            </h2>
            <p className="mt-6 text-lg font-light leading-relaxed text-subtle">
              We understand the sensitive nature of financial data. That&apos;s
              why our platform employs cutting-edge security measures to keep
              your information safe and compliant with industry standards.
            </p>

            <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {securityFeatures.map((feature) => (
                <li
                  key={feature.title}
                  className="relative border-l-2 border-primary/20 pl-4 transition-colors hover:border-primary/60"
                >
                  <h3 className="text-base font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-body">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Dashboard UI */}
          <aside
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#073344] shadow-2xl shadow-[#073344]/40 transition-transform duration-500 hover:-translate-y-1 hover:shadow-3xl"
            aria-label="Security dashboard preview"
          >
            {/* Window Header */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
                <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
              </div>
              <span className="ml-3 text-[12px] font-medium tracking-wide text-primary-tint">
                Security Dashboard
              </span>
            </div>

            <div className="p-6">
              {/* System Status Banner */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#28c840] opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#28c840]"></span>
                  </span>
                  <span className="text-sm font-semibold text-white">
                    System Status
                  </span>
                </div>
                <span className="rounded-full bg-[#d1fae5] px-3 py-1 text-[11px] font-bold tracking-wide text-[#065f46] uppercase shadow-sm">
                  Secure
                </span>
              </div>

              {/* Status Grid */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                {securityStatuses.map((item) => (
                  <div
                    key={item.label}
                    className="group rounded-xl border border-white/5 bg-white-[0.03] px-4 py-3.5 transition-colors hover:bg-white/10"
                  >
                    <p className="text-[12px] font-medium text-primary-tint">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-primary-soft transition-colors group-hover:text-white">
                      {item.status}
                    </p>
                  </div>
                ))}
              </div>

              {/* Certifications */}
              <h3 className="mt-8 text-[11px] font-bold tracking-widest text-primary-soft/70 uppercase">
                Security Certifications
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {securityCertifications.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center transition-colors hover:bg-white/10"
                  >
                    <p className="text-[13px] font-semibold text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-primary-tint">
                      {item.status}
                    </p>
                  </div>
                ))}
              </div>

              {/* Logs */}
              <h3 className="mt-8 text-[11px] font-bold tracking-widest text-primary-soft/70 uppercase">
                Recent Security Logs
              </h3>
              <ul className="mt-3 space-y-2">
                {securityLogs.map((log) => (
                  <li
                    key={log.message}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className="font-mono text-[12px] text-primary-tint transition-colors group-hover:text-white">
                      {log.message}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-white/40">
                      {log.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
