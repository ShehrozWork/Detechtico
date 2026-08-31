import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { comparisonRows } from "@/data/comparison";

function ComparisonCell({
  row,
  column,
}: {
  row: (typeof comparisonRows)[number];
  column: "detechtico" | "others";
}) {
  if (row.type === "price") {
    return (
      <span
        className={`text-sm ${
          column === "detechtico"
            ? "font-semibold text-primary-deep"
            : "text-subtle"
        }`}
      >
        {row[column]}
      </span>
    );
  }

  const included = Boolean(row[column]);

  return (
    <Icon
      name={included ? "check" : "x"}
      className={`h-5.5 w-5.5 ${included ? "text-primary" : "text-line"}`}
      strokeWidth={2.4}
    />
  );
}

export function Comparison() {
  return (
    <section id="comparison" className="bg-canvas py-12 sm:py-16 lg:py-22">
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-[-0.5px] text-ink sm:text-[34px]">
          <b>Detechtico</b> vs. Traditional Analysis Tools
        </h2>
        <p className="mt-3 text-center text-base text-subtle sm:text-[15px]">
          See what makes explainable financial analysis different.
        </p>

        {/* Mobile: stacked feature cards */}
        <ul className="mt-8 flex flex-col gap-3 sm:hidden">
          {comparisonRows.map((row) => (
            <li
              key={row.feature}
              className="rounded-[14px] border border-hairline bg-white px-4 py-4"
            >
              <p className="text-[15px] font-semibold text-ink">{row.feature}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[10px] bg-sunken px-3 py-3 text-center">
                  <p className="text-[12px] font-semibold tracking-[0.04em] text-primary-hover uppercase">
                    Detechtico
                  </p>
                  <div className="mt-2 flex justify-center">
                    <ComparisonCell row={row} column="detechtico" />
                  </div>
                </div>
                <div className="rounded-[10px] bg-surface px-3 py-3 text-center">
                  <p className="text-[12px] font-semibold tracking-[0.04em] text-subtle uppercase">
                    Others
                  </p>
                  <div className="mt-2 flex justify-center">
                    <ComparisonCell row={row} column="others" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Tablet / desktop: comparison table */}
        <div className="mx-auto mt-10 hidden max-w-220 overflow-x-auto rounded-[14px] border border-hairline sm:block">
          <div className="min-w-[36rem]">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,10.5rem)_minmax(7.5rem,10.5rem)] items-center border-b border-hairline bg-surface text-sm font-semibold">
              <div className="px-4 py-4 md:px-5.5 md:py-4.5">Feature</div>
              <div className="bg-sunken px-2 py-4 text-center font-bold text-primary-hover md:px-2.5 md:py-4.5">
                Detechtico
              </div>
              <div className="px-2 py-4 text-center text-subtle md:px-2.5 md:py-4.5">
                Others
              </div>
            </div>

            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,10.5rem)_minmax(7.5rem,10.5rem)] items-center border-b border-hairline last:border-b-0"
              >
                <div className="px-4 py-4 text-[15px] md:px-5.5 md:py-4.5">
                  {row.feature}
                </div>
                <div className="flex justify-center bg-sunken px-2 py-4 md:px-2.5 md:py-4.5">
                  <ComparisonCell row={row} column="detechtico" />
                </div>
                <div className="flex justify-center px-2 py-4 md:px-2.5 md:py-4.5">
                  <ComparisonCell row={row} column="others" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
