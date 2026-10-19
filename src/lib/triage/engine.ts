import type { AnswerValue, Answers, Condition, Question, TriageDefinition } from "./schema";

/**
 * Motor da triagem: regras fixas, sem IA, sem pontuação.
 * Saídas possíveis para o PACIENTE: bloqueio por emergência e mensagem de acolhimento.
 * Saídas para o MÉDICO: alertas. Nada aqui sugere tratamento, remédio ou dose.
 */

export function matches(cond: Condition, answers: Answers): boolean {
  const v: AnswerValue | undefined = answers[cond.q];
  if (v === undefined || v === null || v === "") return false;
  const target = cond.value;
  switch (cond.op) {
    case "eq":
      return v === target;
    case "neq":
      return v !== target;
    case "in":
      return Array.isArray(target) && target.includes(String(v));
    case "includesAny":
      return Array.isArray(v) && Array.isArray(target) && v.some((x) => target.includes(x));
    case "excludesAll":
      // verdadeiro se a resposta tem algum item FORA da lista (ex.: marcou algo além de "nenhum")
      return Array.isArray(v) && Array.isArray(target) && v.some((x) => !target.includes(x));
    case "gte":
      return typeof v === "number" && typeof target === "number" && v >= target;
    case "lte":
      return typeof v === "number" && typeof target === "number" && v <= target;
    default:
      return false;
  }
}

export function visibleQuestions(def: TriageDefinition, answers: Answers): Question[] {
  return def.questions.filter((q) => !q.showIf || matches(q.showIf, answers));
}

export function isAnswered(q: Question, v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (q.type === "multi" || q.type === "photos" || q.type === "files") return Array.isArray(v) && v.length > 0;
  if (q.type === "text") return typeof v === "string" && v.trim().length > 0;
  if (q.type === "number") return typeof v === "number" && !Number.isNaN(v);
  return v !== "";
}

export function validateAnswer(q: Question, v: AnswerValue | undefined): string | null {
  if (!isAnswered(q, v)) {
    if (q.required && q.type !== "photos" && q.type !== "files") return "Responda para continuar.";
    return null;
  }
  if (q.type === "number" && typeof v === "number") {
    if (q.min !== undefined && v < q.min) return `Informe um valor a partir de ${q.min}.`;
    if (q.max !== undefined && v > q.max) return `Informe um valor até ${q.max}.`;
  }
  if (q.type === "text" && typeof v === "string" && q.maxLength && v.length > q.maxLength) {
    return `Use até ${q.maxLength} caracteres.`;
  }
  if ((q.type === "single" || q.type === "yesno") && q.options && !q.options.some((o) => o.value === v)) {
    return "Escolha uma das opções.";
  }
  return null;
}

/** Aplica a regra de opção exclusiva ("nenhuma" desmarca as outras e vice-versa). */
export function toggleMulti(q: Question, current: string[], value: string): string[] {
  const has = current.includes(value);
  if (q.exclusiveValue && value === q.exclusiveValue) return has ? [] : [value];
  const base = current.filter((x) => x !== q.exclusiveValue);
  return has ? base.filter((x) => x !== value) : [...base, value];
}

export interface TriageAlert {
  code: string;
  label: string;
  questionId: string;
}

export interface TriageEvaluation {
  /** Se definido, o fluxo para aqui e nada é agendado. */
  blocked: { kind: "emergency"; questionId: string } | null;
  /** Só para o médico. */
  alerts: TriageAlert[];
  /** Mensagens de acolhimento para o paciente (não interrompem). */
  support: "cvv"[];
}

export function evaluate(def: TriageDefinition, answers: Answers): TriageEvaluation {
  const visible = visibleQuestions(def, answers);
  let blocked: TriageEvaluation["blocked"] = null;
  const alerts: TriageAlert[] = [];
  const support = new Set<"cvv">();
  for (const q of visible) {
    if (!blocked && q.block && matches(q.block.when, answers)) blocked = { kind: q.block.kind, questionId: q.id };
    if (q.alert && matches(q.alert.when, answers)) alerts.push({ code: q.alert.code, label: q.alert.label, questionId: q.id });
    if (q.support && matches(q.support.when, answers)) support.add(q.support.kind);
  }
  return { blocked, alerts, support: [...support] };
}

/** Remove respostas de perguntas que ficaram ocultas (ex.: mudou o sexo informado). */
export function pruneAnswers(def: TriageDefinition, answers: Answers): Answers {
  const ids = new Set(visibleQuestions(def, answers).map((q) => q.id));
  return Object.fromEntries(Object.entries(answers).filter(([k]) => ids.has(k)));
}

/** Idade em anos completos na data de referência (fuso não importa para data de nascimento). */
export function ageOn(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  return ageOn(birthDate, today) >= 18;
}
