import { describe, expect, it } from "vitest";
import { triageV1 } from "@/content/triage/v1";
import { launchSlugs } from "@/content/careLines";
import { validateDefinition } from "@/lib/triage/schema";
import { ageOn, evaluate, isAdult, pruneAnswers, toggleMulti, validateAnswer, visibleQuestions } from "@/lib/triage/engine";

describe("triagem v1", () => {
  it.each(launchSlugs)("a triagem de %s é válida e não pede remédio nem dose", (slug) => {
    const r = validateDefinition(triageV1(slug));
    expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
  });

  it("recusa triagem que pede remédio ou sugere tratamento", () => {
    const bad = {
      care_line: "cabelo",
      title: "x",
      questions: [{ id: "q", type: "text", label: "Qual remédio você quer usar?", required: true }],
    };
    expect(validateDefinition(bad).ok).toBe(false);
    const bad2 = { ...bad, questions: [{ id: "q", type: "text", label: "Você é elegível para o tratamento X", required: true }] };
    expect(validateDefinition(bad2).ok).toBe(false);
  });

  it("recusa campos fora do esquema (ex.: resultado ou produto sugerido)", () => {
    const def = { ...triageV1("cabelo"), resultado: "produto X" };
    expect(validateDefinition(def).ok).toBe(false);
  });

  it("recusa referência a pergunta inexistente", () => {
    const def = triageV1("pele");
    def.questions[1] = { ...def.questions[1], showIf: { q: "nao_existe", op: "eq", value: "x" } };
    expect(validateDefinition(def).ok).toBe(false);
  });
});

describe("motor da triagem", () => {
  const def = triageV1("sono-e-energia");

  it("bloqueia o fluxo quando há sinal de urgência", () => {
    expect(evaluate(def, { urgencia: ["dor_peito"] }).blocked?.kind).toBe("emergency");
    expect(evaluate(def, { urgencia: ["nenhum"] }).blocked).toBeNull();
  });

  it("a pergunta de gestação só aparece para sexo feminino", () => {
    expect(visibleQuestions(def, { sexo: "M" }).some((q) => q.id === "gestacao")).toBe(false);
    expect(visibleQuestions(def, { sexo: "F" }).some((q) => q.id === "gestacao")).toBe(true);
  });

  it("remove respostas de perguntas que ficaram ocultas", () => {
    expect(pruneAnswers(def, { sexo: "M", gestacao: "gravida" })).toEqual({ sexo: "M" });
  });

  it("gera alertas só para o médico e acolhimento (CVV) sem bloquear", () => {
    const ev = evaluate(def, { sexo: "F", gestacao: "amamentando", sono_ronco: "sim", sono_humor: "sim", urgencia: ["nenhum"] });
    expect(ev.blocked).toBeNull();
    expect(ev.alerts.map((a) => a.code).sort()).toEqual(["gestacao", "humor_baixo", "suspeita_apneia"]);
    expect(ev.support).toEqual(["cvv"]);
  });

  it("a avaliação nunca devolve sugestão de tratamento", () => {
    const ev = evaluate(def, { sono_ronco: "sim" });
    expect(Object.keys(ev).sort()).toEqual(["alerts", "blocked", "support"]);
  });

  it("opção exclusiva 'nenhum' desmarca as outras e vice-versa", () => {
    const q = def.questions.find((x) => x.id === "urgencia")!;
    expect(toggleMulti(q, ["dor_peito"], "nenhum")).toEqual(["nenhum"]);
    expect(toggleMulti(q, ["nenhum"], "falta_ar")).toEqual(["falta_ar"]);
  });

  it("valida número, texto e obrigatoriedade", () => {
    const peso = def.questions.find((x) => x.id === "peso")!;
    expect(validateAnswer(peso, 10)).toMatch(/a partir de/);
    expect(validateAnswer(peso, 70)).toBeNull();
    expect(validateAnswer(peso, undefined)).toMatch(/Responda/);
    const fotos = triageV1("cabelo").questions.find((x) => x.id === "cabelo_fotos")!;
    expect(validateAnswer(fotos, [])).toBeNull();
  });
});

describe("idade", () => {
  it("calcula idade e maioridade", () => {
    const ref = new Date(2026, 9, 19);
    expect(ageOn("2008-10-19", ref)).toBe(18);
    expect(ageOn("2008-10-20", ref)).toBe(17);
    expect(isAdult("2008-10-20", ref)).toBe(false);
    expect(isAdult("1990-01-01", ref)).toBe(true);
  });
});
