import type { PlanItem, Prescription, PrescriptionInput } from "@/lib/api/types";
import { PLAN_SECTIONS } from "@/content/planSuggestions";

export const MAX_PRESCRIPTION_ITEMS = 30;

/** Limpa espaços e linhas vazias e confere o mínimo para emitir a receita. Lança erro com mensagem para o médico. */
export function validatePrescription(input: PrescriptionInput): PrescriptionInput {
  const items = input.items
    .map((i) => ({ name: i.name.trim(), dose: i.dose.trim() }))
    .filter((i) => i.name || i.dose);
  if (items.length === 0) throw new Error("Adicione pelo menos um componente à receita.");
  if (items.length > MAX_PRESCRIPTION_ITEMS) throw new Error(`A receita aceita até ${MAX_PRESCRIPTION_ITEMS} componentes.`);
  if (items.some((i) => !i.name || !i.dose)) throw new Error("Preencha o nome e a dose de cada componente.");
  const form = input.form.trim();
  const quantity = input.quantity.trim();
  const directions = input.directions.trim();
  if (!form) throw new Error("Informe a forma (ex.: cápsulas, sachês).");
  if (!quantity) throw new Error("Informe a quantidade total.");
  if (!directions) throw new Error("Informe o modo de uso.");
  return { form, quantity, directions, items };
}

/** Texto simples da receita (usado no arquivo da demonstração). */
export function prescriptionText(p: Pick<Prescription, "form" | "quantity" | "directions" | "items">): string {
  const lines = p.items.map((i, n) => `${n + 1}. ${i.name} — ${i.dose}`);
  return [`Forma: ${p.form}`, `Quantidade: ${p.quantity}`, "", "Componentes:", ...lines, "", `Modo de uso: ${p.directions}`].join("\n");
}

export const MAX_PLAN_ITEMS = 60;

/** Limpa o "Seu Plano": tira linhas vazias e confere seções e tamanho. */
export function validatePlan(items: PlanItem[]): PlanItem[] {
  const clean = items
    .map((i) => ({ section: i.section, title: i.title.trim(), detail: i.detail?.trim() || null }))
    .filter((i) => i.title);
  if (clean.length > MAX_PLAN_ITEMS) throw new Error(`O plano aceita até ${MAX_PLAN_ITEMS} itens.`);
  if (clean.some((i) => !(i.section in PLAN_SECTIONS))) throw new Error("Seção do plano inválida.");
  if (clean.some((i) => i.title.length > 140 || (i.detail?.length ?? 0) > 400)) throw new Error("Algum item do plano está longo demais.");
  return clean;
}
