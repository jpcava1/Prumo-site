import { careLineContent, launchSlugs } from "./careLines";
import { triageV1 } from "./triage/v1";
import { validateDefinition } from "@/lib/triage/schema";

/** Preços iniciais (briefing, seção 13). Editáveis depois no painel. */
export const DEFAULT_PRICE_CENTS = 9990;
export const DEFAULT_RETURN_PRICE_CENTS = 6990;

function sqlString(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

export function buildSeedSql(): string {
  const lines: string[] = [
    "-- GERADO POR scripts/generate-triage-seed.ts — não edite à mão (npm run seed:triage).",
    "-- Linhas de cuidado e triagem v1. A triagem precisa ser aprovada pelo diretor técnico.",
    "",
  ];
  launchSlugs.forEach((slug, i) => {
    const c = careLineContent[slug];
    lines.push(
      `insert into public.care_lines (slug, name, short, status, price_cents, return_price_cents, sort) values (${sqlString(slug)}, ${sqlString(c.name)}, ${sqlString(c.short)}, 'ativa', ${DEFAULT_PRICE_CENTS}, ${DEFAULT_RETURN_PRICE_CENTS}, ${i + 1}) on conflict (slug) do nothing;`,
    );
  });
  lines.push("");
  for (const slug of launchSlugs) {
    const def = triageV1(slug);
    const v = validateDefinition(def);
    if (!v.ok) throw new Error(`Triagem ${slug} inválida: ${v.errors.join("; ")}`);
    lines.push(
      `insert into public.triage_versions (care_line, version, definition, published_at) values (${sqlString(slug)}, 1, ${sqlString(JSON.stringify(def))}::jsonb, now()) on conflict (care_line, version) do nothing;`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
