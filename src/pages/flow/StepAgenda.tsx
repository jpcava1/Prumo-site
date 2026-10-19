import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Notice, Spinner } from "@/components/ui";
import { DoctorCard } from "@/pages/public/Doctors";
import { useFlow } from "@/context/FlowContext";
import { useProfessionals } from "@/hooks/useData";
import { api } from "@/lib/api";
import type { Slot } from "@/lib/schedule";
import { cn, formatDate, formatTime, localDateKey } from "@/lib/utils";
import { policy } from "@/config/site";
import { track } from "@/lib/analytics";

export default function StepAgenda() {
  const navigate = useNavigate();
  const flow = useFlow();
  const { data: pros } = useProfessionals();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [profFilter, setProfFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!flow.careLine) return;
    setSlots(null);
    try {
      const s = await api.listSlots(flow.careLine, new Date().toISOString(), policy.bookingWindowDays);
      setSlots(s);
      if (s.length) setDay((d) => d ?? localDateKey(s[0].starts_at));
    } catch (e) {
      setError((e as Error).message);
      setSlots([]);
    }
  }

  useEffect(() => {
    track("fluxo_etapa_agenda");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.careLine]);

  const filtered = useMemo(() => (slots ?? []).filter((s) => profFilter === "todos" || s.professional_id === profFilter), [slots, profFilter]);
  const days = useMemo(() => [...new Set(filtered.map((s) => localDateKey(s.starts_at)))], [filtered]);
  // Com "qualquer profissional", mostra cada horário uma vez só (o primeiro profissional livre).
  const daySlots = filtered
    .filter((s) => localDateKey(s.starts_at) === day)
    .filter((s, i, arr) => arr.findIndex((x) => x.starts_at === s.starts_at) === i);
  const prof = (id: string) => pros?.find((p) => p.id === id);

  if (!flow.careLine) return <Navigate to="/comecar" replace />;
  if (flow.kind === "primeira" && !flow.triageResponseId) return <Navigate to="/comecar/triagem" replace />;

  async function reserve(slot: Slot) {
    setError(null);
    setBusy(true);
    try {
      const appt = await api.reserveSlot({
        professional_id: slot.professional_id,
        starts_at: slot.starts_at,
        care_line: flow.careLine!,
        kind: flow.kind,
        triage_response_id: flow.kind === "primeira" ? flow.triageResponseId : null,
      });
      flow.setAppointmentId(appt.id);
      navigate("/comecar/pagamento");
    } catch (e) {
      setError((e as Error).message);
      setSelected(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Escolha o horário</h1>
      <p className="mt-2 text-muted">Consulta por vídeo de até {policy.consultMinutes} minutos. Horário de Brasília.</p>

      {slots === null ? (
        <Spinner label="Buscando horários" />
      ) : slots.length === 0 ? (
        <div className="mt-8">
          <Notice tone="warning" title="Sem horários nos próximos dias">
            Abra esta página de novo mais tarde ou fale com o atendimento pelo WhatsApp.
          </Notice>
        </div>
      ) : (
        <>
          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={() => {
              const first = filtered[0];
              if (first) {
                setDay(localDateKey(first.starts_at));
                setSelected(first);
              }
            }}
          >
            Primeiro horário disponível
          </Button>

          {pros && pros.length > 1 && (
            <div className="mt-6">
              <label htmlFor="prof" className="text-sm font-medium">
                Profissional
              </label>
              <select
                id="prof"
                className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-4"
                value={profFilter}
                onChange={(e) => {
                  setProfFilter(e.target.value);
                  setSelected(null);
                  setDay(null);
                }}
              >
                <option value="todos">Qualquer profissional</option>
                {pros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} — {p.council} {p.council_number}/{p.council_uf}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="-mx-4 mt-6 overflow-x-auto px-4">
            <div className="flex gap-2 pb-2">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDay(d);
                    setSelected(null);
                  }}
                  className={cn(
                    "shrink-0 rounded-xl border px-4 py-3 text-sm",
                    d === day ? "border-primary bg-primary text-primary-ink" : "border-border bg-surface hover:border-primary",
                  )}
                >
                  {formatDate(d + "T12:00:00-03:00")}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(day ? daySlots : []).map((s) => (
              <button
                key={s.professional_id + s.starts_at}
                onClick={() => setSelected(s)}
                className={cn(
                  "h-12 rounded-xl border text-[15px] font-medium",
                  selected === s ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:border-primary",
                )}
                aria-pressed={selected === s}
              >
                {formatTime(s.starts_at)}
              </button>
            ))}
          </div>
        </>
      )}

      {selected && prof(selected.professional_id) && (
        <div className="mt-8 space-y-4">
          <p className="text-sm font-medium">Quem vai atender</p>
          <DoctorCard p={prof(selected.professional_id)!} compact />
          <Button size="lg" className="w-full" loading={busy} onClick={() => reserve(selected)}>
            Reservar {formatDate(selected.starts_at)} às {formatTime(selected.starts_at)}
          </Button>
          <p className="text-center text-xs text-muted">O horário fica reservado por {policy.holdMinutes} minutos enquanto você paga.</p>
        </div>
      )}

      {error && (
        <div className="mt-6">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </div>
  );
}
