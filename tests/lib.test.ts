import { describe, expect, it } from "vitest";
import { formatCPF, isValidCPF, maskCPF } from "@/lib/cpf";
import { canCancelFree, canJoin, generateSlots } from "@/lib/schedule";
import { breakEvenConsults, contributionCents, defaultFirstConsult, defaultReturnConsult } from "@/lib/pricing";
import { adPixelsAllowed, isPrivatePath, sanitizeProps } from "@/lib/analytics";
import { buildIcs } from "@/lib/ics";

describe("CPF", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("529.982.247-24")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });
  it("formata e mascara", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
    expect(maskCPF("52998224725")).toBe("***.***.**7-25");
  });
});

describe("agenda", () => {
  const rules = [{ professional_id: "p1", weekday: 1, start_time: "08:00", end_time: "10:00" }];
  // Segunda-feira 19/10/2026, 05:00 em Brasília (08:00 UTC)
  const now = new Date("2026-10-19T08:00:00Z");

  it("gera horários de 30 min no fuso de Brasília", () => {
    const s = generateSlots({ rules, busy: [], from: now, days: 1, now, minLeadMinutes: 60 });
    expect(s.map((x) => x.starts_at)).toEqual([
      "2026-10-19T08:00:00-03:00",
      "2026-10-19T08:30:00-03:00",
      "2026-10-19T09:00:00-03:00",
      "2026-10-19T09:30:00-03:00",
    ]);
  });

  it("respeita antecedência mínima e horários ocupados", () => {
    const busy = [{ professional_id: "p1", starts_at: "2026-10-19T09:00:00-03:00", ends_at: "2026-10-19T09:30:00-03:00" }];
    const later = new Date("2026-10-19T10:10:00Z"); // 07:10 em Brasília
    const s = generateSlots({ rules, busy, from: now, days: 1, now: later, minLeadMinutes: 60 });
    expect(s.map((x) => x.starts_at)).toEqual(["2026-10-19T08:30:00-03:00", "2026-10-19T09:30:00-03:00"]);
  });

  it("cancelamento grátis só até 2 h antes; entrada libera 10 min antes", () => {
    const start = "2026-10-19T15:00:00-03:00";
    const end = "2026-10-19T15:30:00-03:00";
    expect(canCancelFree(start, new Date("2026-10-19T12:59:00-03:00"))).toBe(true);
    expect(canCancelFree(start, new Date("2026-10-19T13:01:00-03:00"))).toBe(false);
    expect(canJoin(start, end, new Date("2026-10-19T14:49:00-03:00"))).toBe(false);
    expect(canJoin(start, end, new Date("2026-10-19T14:51:00-03:00"))).toBe(true);
  });
});

describe("conta por consulta (briefing, seção 13)", () => {
  it("R$ 99,90 deixa R$ 18,91 e R$ 8,92 com 10% de influenciador", () => {
    expect(contributionCents(9990, defaultFirstConsult)).toBe(1891);
    expect(contributionCents(9990, { ...defaultFirstConsult, influencerRate: 0.1 })).toBe(892);
  });
  it("R$ 79,90 empata e o retorno de R$ 69,90 deixa R$ 13,41", () => {
    expect(contributionCents(7990, defaultFirstConsult)).toBe(191);
    expect(contributionCents(6990, defaultReturnConsult)).toBe(1341);
  });
  it("ponto de equilíbrio com R$ 10,5 mil de custo fixo", () => {
    expect(breakEvenConsults(1_050_000, 1891)).toBe(556);
    expect(breakEvenConsults(1_050_000, -5)).toBeNull();
  });
});

describe("analytics e LGPD", () => {
  it("pixels de anúncio nunca carregam no fluxo, na conta ou no painel", () => {
    for (const p of ["/comecar", "/comecar/triagem", "/minha-conta", "/minha-conta/documentos/1", "/painel", "/entrar"]) {
      expect(isPrivatePath(p)).toBe(true);
      expect(adPixelsAllowed(p, true)).toBe(false);
    }
  });
  it("pixels nas páginas públicas só com aceite de cookies", () => {
    expect(adPixelsAllowed("/", false)).toBe(false);
    expect(adPixelsAllowed("/", true)).toBe(true);
  });
  it("remove qualquer propriedade com cara de dado de saúde", () => {
    expect(sanitizeProps({ etapa: 3, linha: "dieta", origem: "instagram", valor: "treino" })).toEqual({ etapa: 3, origem: "instagram" });
  });
  it("o convite de agenda não cita motivo da consulta", () => {
    const ics = buildIcs({ id: "a", startsAt: "2026-10-20T10:00:00-03:00", endsAt: "2026-10-20T10:30:00-03:00", url: "https://x/minha-conta" });
    expect(ics).toContain("SUMMARY:Consulta Prumo");
    expect(ics).not.toMatch(/energia|dieta|treino|sono|suplement/i);
  });
});
