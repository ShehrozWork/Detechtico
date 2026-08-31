import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";

const trustItems: { label: string; icon: "shield" | "file" | "eye" }[] = [
  { label: "SOC 2-aligned", icon: "shield" },
  { label: "End-to-end encryption", icon: "shield" },
  { label: "RLS policies", icon: "shield" },
  { label: "Audit-ready reports", icon: "file" },
  { label: "Built by a forensic accountant", icon: "eye" },
];

export function Trust() {
  return (
    <>
      <section className="bg-canvas py-10">
        <Container>
          <ul className="flex flex-wrap items-center justify-between gap-6">
            {trustItems.map((item) => (
              <li
                key={item.label}
                className="flex flex-1 basis-37.5 items-center justify-center gap-2.5 text-[14.5px] font-medium text-body"
              >
                <Icon
                  name={item.icon}
                  className="h-5.5 w-5.5 shrink-0 text-primary"
                  strokeWidth={1.7}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <div className="h-6.5 bg-primary-tint" />
    </>
  );
}
