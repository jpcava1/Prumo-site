import { CheckSquare } from "lucide-react";
import type { PlanItem } from "@/lib/api";
import { MEAL_SECTIONS, PLAN_SECTIONS, type PlanSection } from "@/content/planSuggestions";

const ORDER: PlanSection[] = ["objetivo", "meta", "cafe", "almoco", "lanche", "jantar", "rotina", "cuidado", "exame"];

/** Seu Plano na tela do paciente (o mesmo conteúdo do PDF). */
export function PlanSummary({ items }: { items: PlanItem[] }) {
  const of = (s: PlanSection) => items.filter((i) => i.section === s);
  const meals = MEAL_SECTIONS.filter((s) => of(s).length);
  return (
    <div className="space-y-6">
      {of("objetivo").length > 0 && (
        <div className="rounded-card bg-primary p-5 text-primary-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky">Seus objetivos</p>
          <p className="mt-2 font-display text-xl">{of("objetivo").map((o) => o.title).join(" · ")}</p>
        </div>
      )}
      {meals.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold">Sua alimentação</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {meals.map((s) => (
              <div key={s} className="rounded-card bg-cream p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{PLAN_SECTIONS[s].label}</p>
                <ul className="mt-2 space-y-2">
                  {of(s).map((it, n) => (
                    <li key={n}>
                      <span className="block font-medium">{it.title}</span>
                      {it.detail && <span className="block text-sm text-muted">{it.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {ORDER.filter((s) => s !== "objetivo" && !MEAL_SECTIONS.includes(s) && of(s).length).map((s) => (
        <section key={s}>
          <h3 className="mb-2 text-xl font-semibold">{PLAN_SECTIONS[s].label}</h3>
          <ul className="space-y-2">
            {of(s).map((it, n) => (
              <li key={n} className="flex gap-3">
                <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-sky" aria-hidden />
                <span>
                  <span className="block font-medium">{it.title}</span>
                  {it.detail && <span className="block text-sm text-muted">{it.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
