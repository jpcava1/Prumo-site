import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Brasil não tem horário de verão desde 2019: o fuso de Brasília é fixo em -03:00. */
export const TZ = "America/Sao_Paulo";
export const TZ_OFFSET = "-03:00";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "long" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** Data local (Brasília) no formato YYYY-MM-DD. */
export function localDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // en-CA já sai como YYYY-MM-DD
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
