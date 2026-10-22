import { TZ_OFFSET } from "./utils";

/**
 * Geração de horários de consulta (mesma regra da função SQL available_slots).
 * Disponibilidade é cadastrada em horário de Brasília (fuso fixo -03:00).
 */

export interface AvailabilityRule {
  professional_id: string;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "HH:MM" */
  start_time: string;
  end_time: string;
}

/** Horário aberto pelo profissional em um dia específico (Brasília). */
export interface DateAvailability {
  professional_id: string;
  /** "YYYY-MM-DD" */
  day: string;
  start_time: string;
  end_time: string;
}

export interface BusyInterval {
  professional_id: string;
  starts_at: string;
  ends_at: string;
}

export interface Slot {
  professional_id: string;
  starts_at: string; // ISO com -03:00
}

const MS_MIN = 60_000;

function brasiliaParts(d: Date) {
  // Converte um instante para a data/hora de parede em Brasília (UTC-3 fixo).
  const shifted = new Date(d.getTime() - 3 * 60 * MS_MIN);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toBrasiliaISO(y: number, m: number, d: number, hh: number, mm: number): string {
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00${TZ_OFFSET}`;
}

export function generateSlots(opts: {
  rules: AvailabilityRule[];
  dateRules?: DateAvailability[];
  busy: BusyInterval[];
  from: Date;
  days: number;
  now?: Date;
  slotMinutes?: number;
  minLeadMinutes?: number;
}): Slot[] {
  const { rules, busy, from, days } = opts;
  const now = opts.now ?? new Date();
  const slotMin = opts.slotMinutes ?? 30;
  const lead = opts.minLeadMinutes ?? 60;
  const earliest = now.getTime() + lead * MS_MIN;
  const out: Slot[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 24 * 60 * MS_MIN);
    const p = brasiliaParts(day);
    const key = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
    const blocks = [
      ...rules.filter((x) => x.weekday === p.weekday),
      ...(opts.dateRules ?? []).filter((x) => x.day === key),
    ];
    for (const r of blocks) {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      for (let t = sh * 60 + sm; t + slotMin <= eh * 60 + em; t += slotMin) {
        const iso = toBrasiliaISO(p.y, p.m, p.d, Math.floor(t / 60), t % 60);
        const start = new Date(iso).getTime();
        const end = start + slotMin * MS_MIN;
        if (start < earliest) continue;
        const clash = busy.some(
          (b) => b.professional_id === r.professional_id && start < new Date(b.ends_at).getTime() && end > new Date(b.starts_at).getTime(),
        );
        const id = `${r.professional_id}|${iso}`;
        if (!clash && !seen.has(id)) {
          seen.add(id);
          out.push({ professional_id: r.professional_id, starts_at: iso });
        }
      }
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.professional_id.localeCompare(b.professional_id));
}

/** Data de hoje em Brasília, "YYYY-MM-DD". */
export function brasiliaToday(now: Date = new Date()): string {
  const p = brasiliaParts(now);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Soma dias a uma data "YYYY-MM-DD". */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Pode remarcar/cancelar sem custo? (até X horas antes) */
export function canCancelFree(startsAt: string, now: Date = new Date(), hours = 2): boolean {
  return new Date(startsAt).getTime() - now.getTime() >= hours * 60 * MS_MIN;
}

/** O botão "Entrar na consulta" fica ativo X minutos antes até o fim do horário. */
export function canJoin(startsAt: string, endsAt: string, now: Date = new Date(), minutesBefore = 10): boolean {
  const t = now.getTime();
  return t >= new Date(startsAt).getTime() - minutesBefore * MS_MIN && t <= new Date(endsAt).getTime();
}
