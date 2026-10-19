/**
 * Analytics com LGPD:
 * - Pixels de anúncio (Meta/Google) só em páginas públicas e só depois do aceite de cookies.
 * - Dentro do fluxo (/comecar) e da conta (/minha-conta, /painel) só eventos de etapa,
 *   sem linha de cuidado, sem resposta, sem nada de saúde.
 */

export const AD_PIXEL_ALLOWED_PATHS = ["/", "/como-funciona", "/preco", "/cabelo", "/pele", "/sono-e-energia", "/suplementacao", "/medicos", "/perguntas"];

const PRIVATE_PREFIXES = ["/comecar", "/minha-conta", "/painel", "/entrar"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function adPixelsAllowed(pathname: string, cookieConsent: boolean): boolean {
  if (!cookieConsent) return false;
  if (isPrivatePath(pathname)) return false;
  return AD_PIXEL_ALLOWED_PATHS.includes(pathname);
}

/** Eventos permitidos. Nenhum carrega dado de saúde. */
export type FunnelEvent =
  | "comecar_click"
  | "fluxo_etapa_motivo"
  | "fluxo_etapa_conta"
  | "fluxo_etapa_triagem"
  | "fluxo_etapa_agenda"
  | "fluxo_etapa_pagamento"
  | "fluxo_concluido";

const HEALTH_KEYS = /linha|care|triag|resposta|answer|sintoma|alerta|receita|cabelo|pele|sono|suplement/i;

export function sanitizeProps(props: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(props).filter(([k, v]) => !HEALTH_KEYS.test(k) && !HEALTH_KEYS.test(String(v))));
}

const COOKIE_KEY = "prumo_cookie_consent";

export function getCookieConsent(): boolean | null {
  try {
    const v = localStorage.getItem(COOKIE_KEY);
    return v === null ? null : v === "accepted";
  } catch {
    return null;
  }
}

export function setCookieConsent(accepted: boolean) {
  try {
    localStorage.setItem(COOKIE_KEY, accepted ? "accepted" : "declined");
  } catch {
    /* navegação privada: segue sem guardar */
  }
}

export function track(event: FunnelEvent, props?: Record<string, string | number | boolean>) {
  const clean = sanitizeProps(props);
  // Integre aqui o PostHog/Plausible próprio. Sem chave configurada, só registra no console em dev.
  if (import.meta.env.DEV) console.debug("[analytics]", event, clean);
}
