import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useData";
import { api, isDemo } from "@/lib/api";
import { addDays, brasiliaToday } from "@/lib/schedule";
import { cn, formatTime, localDateKey } from "@/lib/utils";
import { careLineContent, type CareLineSlug } from "@/content/careLines";

/*
 * Horários do profissional por dia.
 * O que ele abre aqui vira horário livre para o paciente na etapa "Escolha o horário",
 * depois que a Prumo aprova o cadastro.
 */

const WINDOW_DAYS = 21;
const SLOT_MIN = 30;
const TIMES = Array.from({ length: (23 - 6) * 2 + 1 }, (_, i) => {
  const m = 6 * 60 + i * SLOT_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const PRESETS = [
  { label: "Manhã", start_time: "08:00", end_time: "12:00" },
  { label: "Tarde", start_time: "13:00", end_time: "18:00" },
  { label: "Noite", start_time: "18:00", end_time: "22:00" },
];
const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Block = { start_time: string; end_time: string };

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const slotsIn = (blocks: Block[]) => blocks.reduce((n, b) => n + Math.max(0, Math.floor((minutes(b.end_time) - minutes(b.start_time)) / SLOT_MIN)), 0);
const lineName = (s: string) => careLineContent[s as CareLineSlug]?.name ?? s;

function dayLabel(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  return { weekday: WEEKDAY[d.getUTCDay()], date: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}` };
}

/** Confere blocos: fim depois do início e sem sobreposição. */
function checkBlocks(blocks: Block[]): string | null {
  const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].end_time <= sorted[i].start_time) return "Em cada período, o fim precisa ser depois do início.";
    if (i > 0 && sorted[i].start_time < sorted[i - 1].end_time) return "Há períodos sobrepostos no mesmo dia.";
  }
  return null;
}

export default function ProfessionalHours() {
  const { professional, refreshProfile } = useAuth();
  const today = brasiliaToday();
  const days = useMemo(() => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i)), [today]);
  const { data: avail, loading, reload } = useAsync(() => api.myListDateAvailability(today, WINDOW_DAYS), [today]);
  const { data: agenda } = useAsync(() => api.doctorAgenda(), []);
  const [day, setDay] = useState(today);
  const [draft, setDraft] = useState<Record<string, Block[]>>({});
  const [repeat, setRepeat] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saved = (d: string): Block[] => (avail ?? []).filter((a) => a.day === d).map(({ start_time, end_time }) => ({ start_time, end_time }));
  const blocks = draft[day] ?? saved(day);
  const setBlocks = (b: Block[]) => {
    setMsg(null);
    setDraft((cur) => ({ ...cur, [day]: b }));
  };
  const consultsOn = (d: string) => (agenda ?? []).filter((a) => localDateKey(a.starts_at) === d);
  const approved = professional?.approval === "aprovado" || (!professional?.approval && professional?.active);

  async function save() {
    setErr(null);
    setMsg(null);
    const problem = checkBlocks(blocks);
    if (problem) return setErr(problem);
    setBusy(true);
    try {
      const targets = repeat ? [day, addDays(day, 7), addDays(day, 14)] : [day];
      for (const t of targets) await api.mySaveDayAvailability(t, blocks);
      setDraft({});
      await reload();
      const n = slotsIn(blocks);
      setMsg(
        n === 0
          ? "Dia fechado. Nenhum horário novo aparece para os pacientes."
          : `${n} horário${n > 1 ? "s" : ""} de ${SLOT_MIN} min ${repeat ? "abertos neste dia e nas 2 semanas seguintes" : "abertos"}.${approved ? " Os pacientes já podem agendar." : " Eles aparecem para os pacientes quando o cadastro for aprovado."}`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Meus horários</h1>
        <p className="mt-1 text-muted">Escolha um dia, abra os períodos em que pode atender e salve. Cada período vira horários de {SLOT_MIN} minutos para os pacientes.</p>
      </div>

      {professional && !approved && (
        <div className="mb-6">
          <Notice tone="warning" title={professional.approval === "recusado" ? "Cadastro não aprovado" : "Cadastro em análise"}>
            {professional.approval === "recusado"
              ? "Fale com a equipe da Prumo para revisar o seu cadastro."
              : `A Prumo está conferindo o seu ${professional.council} ${professional.council_number}/${professional.council_uf}. Você já pode abrir horários: eles aparecem para os pacientes assim que o cadastro for aprovado.`}
            {isDemo && api.demoApproveMyProfessional && professional.approval !== "recusado" && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await api.demoApproveMyProfessional!();
                    await refreshProfile();
                  }}
                >
                  Demonstração: simular aprovação da Prumo
                </Button>
              </div>
            )}
          </Notice>
        </div>
      )}

      {loading && <Spinner />}
      {!loading && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Calendário dos próximos dias */}
          <div className="grid grid-cols-3 content-start gap-2 self-start sm:grid-cols-7">
            {days.map((d) => {
              const { weekday, date } = dayLabel(d);
              const b = draft[d] ?? saved(d);
              const n = slotsIn(b);
              const c = consultsOn(d).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDay(d);
                    setMsg(null);
                    setErr(null);
                  }}
                  aria-pressed={d === day}
                  className={cn(
                    "flex min-h-[92px] flex-col items-start gap-1 rounded-card border p-3 text-left transition-colors",
                    d === day ? "border-primary bg-primary-soft/60" : "border-border bg-surface hover:border-primary",
                  )}
                >
                  <span className="text-xs uppercase tracking-wide text-muted">{weekday}</span>
                  <span className="font-semibold tabular-nums">{date}</span>
                  {n > 0 ? <span className="text-xs text-success">{n} livres</span> : <span className="text-xs text-muted">fechado</span>}
                  {c > 0 && <span className="text-xs font-medium text-accent">{c} consulta{c > 1 ? "s" : ""}</span>}
                </button>
              );
            })}
          </div>

          {/* Editor do dia selecionado */}
          <Card className="space-y-5 self-start">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">
                {dayLabel(day).weekday}, {dayLabel(day).date}
              </h2>
              <Badge tone={slotsIn(blocks) ? "success" : "neutral"}>{slotsIn(blocks)} horários</Badge>
            </div>

            <div className="space-y-2">
              {blocks.length === 0 && <p className="text-sm text-muted">Nenhum período aberto neste dia.</p>}
              {blocks.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    aria-label={`Início do período ${i + 1}`}
                    value={b.start_time}
                    onChange={(e) => setBlocks(blocks.map((x, n) => (n === i ? { ...x, start_time: e.target.value } : x)))}
                    className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 tabular-nums"
                  >
                    {TIMES.slice(0, -1).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-muted">até</span>
                  <select
                    aria-label={`Fim do período ${i + 1}`}
                    value={b.end_time}
                    onChange={(e) => setBlocks(blocks.map((x, n) => (n === i ? { ...x, end_time: e.target.value } : x)))}
                    className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 tabular-nums"
                  >
                    {TIMES.slice(1).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setBlocks(blocks.filter((_, n) => n !== i))} className="rounded-lg p-2 text-muted hover:text-danger" aria-label={`Remover período ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setBlocks([...blocks, { start_time: p.start_time, end_time: p.end_time }])}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> {p.label} {p.start_time}–{p.end_time}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBlocks([...blocks, { start_time: "09:00", end_time: "10:00" }])}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Outro período
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
              Repetir nas próximas 2 semanas, no mesmo dia da semana
            </label>

            <Button onClick={save} loading={busy} className="w-full">
              Salvar horários do dia
            </Button>
            {err && <Notice tone="danger">{err}</Notice>}
            {msg && <Notice tone="success">{msg}</Notice>}

            <div className="border-t border-border pt-4">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <CalendarCheck className="h-4 w-4 text-accent" aria-hidden /> Consultas marcadas neste dia
              </p>
              {consultsOn(day).length === 0 ? (
                <p className="text-sm text-muted">Nenhuma consulta marcada.</p>
              ) : (
                <ul className="space-y-1 text-[15px]">
                  {consultsOn(day).map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span className="tabular-nums">{formatTime(a.starts_at)}</span>
                      <span className="text-muted">
                        {lineName(a.care_line)} · {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/painel/medico" className="mt-3 inline-block text-sm font-medium">
                Abrir agenda e atender
              </Link>
              <p className="mt-2 text-xs text-muted">Fechar um período não cancela consultas já marcadas.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
