import { z } from "zod";

/**
 * Formato da triagem versionada (tabela triage_versions.definition).
 * A triagem é uma ANAMNESE para o médico ler. Ela não decide tratamento:
 * não existe campo de "resultado", "pontuação" ou "produto sugerido" neste formato,
 * e o validador recusa qualquer chave fora do esquema (.strict()).
 */

export const conditionSchema = z
  .object({
    q: z.string().min(1),
    op: z.enum(["eq", "neq", "in", "includesAny", "excludesAll", "gte", "lte"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })
  .strict();
export type Condition = z.infer<typeof conditionSchema>;

const optionSchema = z.object({ value: z.string().min(1), label: z.string().min(1) }).strict();

export const questionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    type: z.enum(["single", "multi", "number", "text", "photos", "files", "yesno"]),
    label: z.string().min(3),
    help: z.string().optional(),
    required: z.boolean().default(true),
    options: z.array(optionSchema).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional(),
    maxLength: z.number().int().positive().optional(),
    maxFiles: z.number().int().positive().max(5).optional(),
    /** Opção que, se marcada, desmarca as outras (ex.: "nenhuma"). */
    exclusiveValue: z.string().optional(),
    showIf: conditionSchema.optional(),
    /** Interrompe o fluxo (só emergência). */
    block: z.object({ when: conditionSchema, kind: z.enum(["emergency"]) }).strict().optional(),
    /** Alerta visível SOMENTE para o médico. */
    alert: z.object({ when: conditionSchema, code: z.string(), label: z.string() }).strict().optional(),
    /** Mensagem de acolhimento ao paciente, sem interromper o fluxo. */
    support: z.object({ when: conditionSchema, kind: z.enum(["cvv"]) }).strict().optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    if ((q.type === "single" || q.type === "multi") && (!q.options || q.options.length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Pergunta ${q.id}: precisa de ao menos 2 opções.` });
    }
  });
export type Question = z.infer<typeof questionSchema>;

export const triageDefinitionSchema = z
  .object({
    care_line: z.string().min(1),
    title: z.string().min(1),
    intro: z.string().optional(),
    questions: z.array(questionSchema).min(1),
  })
  .strict()
  .superRefine((def, ctx) => {
    const ids = new Set<string>();
    for (const q of def.questions) {
      if (ids.has(q.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ID repetido: ${q.id}` });
      ids.add(q.id);
    }
    for (const q of def.questions) {
      for (const c of [q.showIf, q.block?.when, q.alert?.when, q.support?.when]) {
        if (c && !ids.has(c.q)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Pergunta ${q.id} referencia "${c.q}", que não existe.` });
        }
      }
    }
  });
export type TriageDefinition = z.infer<typeof triageDefinitionSchema>;

export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

/** Palavras que não podem aparecer em nenhum texto da triagem (pedido de remédio, sugestão de produto). */
export const FORBIDDEN_TRIAGE_PATTERNS: RegExp[] = [
  /qual (rem[eé]dio|medicamento|f[oó]rmula) (voc[eê] )?(quer|deseja|prefere)/i,
  /eleg[ií]vel para/i,
  /recomendamos (o|a|os|as) /i,
  /seu tratamento ideal/i,
  /dose/i,
];

export function validateDefinition(input: unknown): { ok: true; value: TriageDefinition } | { ok: false; errors: string[] } {
  const parsed = triageDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "definição"}: ${i.message}`) };
  }
  const texts = parsed.data.questions.flatMap((q) => [q.label, q.help ?? "", ...(q.options ?? []).map((o) => o.label)]);
  const hits = texts.filter((t) => FORBIDDEN_TRIAGE_PATTERNS.some((p) => p.test(t)));
  if (hits.length) {
    return { ok: false, errors: hits.map((t) => `Texto proibido na triagem (não pode pedir/sugerir remédio ou dose): "${t}"`) };
  }
  return { ok: true, value: parsed.data };
}
