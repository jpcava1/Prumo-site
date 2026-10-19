/**
 * Conta por atendimento (briefing, seção 13). Usado no painel para mostrar a margem
 * quando o admin muda o preço. Valores em centavos.
 * Premissas: impostos 11% e gateway 4% (validar com o contador), tecnologia R$ 6 [estimado].
 */
export interface UnitAssumptions {
  taxRate: number;
  gatewayRate: number;
  professionalCents: number;
  techCents: number;
  influencerRate: number;
}

export const defaultFirstConsult: UnitAssumptions = {
  taxRate: 0.11,
  gatewayRate: 0.04,
  professionalCents: 6000,
  techCents: 600,
  influencerRate: 0,
};

export const defaultReturnConsult: UnitAssumptions = { ...defaultFirstConsult, professionalCents: 4000 };

export function contributionCents(priceCents: number, a: UnitAssumptions): number {
  const variable = Math.round(priceCents * (a.taxRate + a.gatewayRate)) + Math.round(priceCents * a.influencerRate);
  return priceCents - variable - a.professionalCents - a.techCents;
}

/** Consultas por mês para cobrir o custo fixo. */
export function breakEvenConsults(fixedMonthlyCents: number, contribution: number): number | null {
  if (contribution <= 0) return null;
  return Math.ceil(fixedMonthlyCents / contribution);
}
