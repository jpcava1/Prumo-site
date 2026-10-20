import type { Prescription, PrescriptionInput } from "@/lib/api/types";

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
