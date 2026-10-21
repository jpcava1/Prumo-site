import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { useAsync } from "@/hooks/useData";
import { api, type Appointment, type DoctorActive, type OutcomeKind, type PlanItem, type PrescriptionInput, type PrescriptionItem } from "@/lib/api";
import { MAX_PRESCRIPTION_ITEMS, validatePlan, validatePrescription } from "@/lib/prescription";
import { useAuth } from "@/context/AuthContext";
import type { PlanSection } from "@/content/planSuggestions";
import { PlanEditor, PlanTabsBar, TemplatesManager, planTabs, type ProKind } from "./CarePlanEditor";

/*
 * Receita montada durante a consulta.
 * Só o médico vê esta tela e a tabela de ativos. O paciente recebe a receita emitida,
 * sem preço e sem farmácia, e escolhe onde manipular.
 */

const emptyRx: PrescriptionInput = { form: "Cápsulas", quantity: "", directions: "", items: [] };

const OUTCOMES: { value: OutcomeKind; label: string }[] = [
  { value: "receita_emitida", label: "Emitir a receita montada acima" },
  { value: "orientacao", label: "Só orientação, sem receita" },
  { value: "pedido_exame", label: "Pedido de exame" },
  { value: "encaminhamento", label: "Encaminhamento presencial" },
  { value: "fora_escopo", label: "Caso fora do escopo" },
];

/** Busca na tabela de ativos do médico para adicionar à receita com um clique. */
function ActivePicker({ actives, onPick }: { actives: DoctorActive[]; onPick: (a: DoctorActive) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? actives.filter((a) => a.name.toLowerCase().includes(t)) : actives).slice(0, 8);
  }, [actives, q]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input id="busca-ativo" placeholder="Buscar na minha tabela de ativos" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar ativo" />
      </div>
      {actives.length === 0 && <p className="text-sm text-muted">Sua tabela de ativos está vazia. Cadastre em “Tabela de ativos” ou digite o componente abaixo.</p>}
      <ul className="flex flex-wrap gap-2">
        {list.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onPick(a)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
              title={a.notes ?? undefined}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {a.name}
              {a.default_dose && <span className="text-muted">· {a.default_dose}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PrescriptionBuilder({ appointment, onFinished }: { appointment: Appointment; onFinished: () => void }) {
  const { professional } = useAuth();
  const kind: ProKind = professional?.kind ?? "medico";
  const { data: actives } = useAsync(() => api.doctorListActives(), []);
  const { data: templates } = useAsync(() => api.doctorListTemplates(), []);
  const [view, setView] = useState<"receita" | "plano">("receita");
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [rx, setRx] = useState<PrescriptionInput>(emptyRx);
  const [loaded, setLoaded] = useState(false);
  const [outcome, setOutcome] = useState<OutcomeKind>("receita_emitida");
  const [returnDays, setReturnDays] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = appointment.status === "realizado";

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setMsg(null);
    setErr(null);
    Promise.all([api.doctorGetPrescriptionDraft(appointment.id), api.doctorGetPlanDraft(appointment.id)])
      .then(([d, p]) => {
        if (!alive) return;
        setRx(d ? { form: d.form || emptyRx.form, quantity: d.quantity, directions: d.directions, items: d.items } : emptyRx);
        setPlan(p?.items ?? []);
        if (d?.document_id || p?.document_id) setMsg("Documentos emitidos. O paciente já pode vê-los e baixá-los na conta dele.");
      })
      .catch((e) => alive && setErr((e as Error).message))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [appointment.id]);

  const setItem = (i: number, patch: Partial<PrescriptionItem>) =>
    setRx((r) => ({ ...r, items: r.items.map((it, n) => (n === i ? { ...it, ...patch } : it)) }));
  const addItem = (item: PrescriptionItem) =>
    setRx((r) => (r.items.length >= MAX_PRESCRIPTION_ITEMS ? r : { ...r, items: [...r.items, item] }));
  const removeItem = (i: number) => setRx((r) => ({ ...r, items: r.items.filter((_, n) => n !== i) }));

  async function saveDraft() {
    setErr(null);
    setMsg(null);
    try {
      await Promise.all([api.doctorSavePrescriptionDraft(appointment.id, rx), api.doctorSavePlanDraft(appointment.id, plan)]);
      setMsg("Rascunho salvo (receita e Seu Plano).");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function finish() {
    setErr(null);
    setMsg(null);
    const days = returnDays ? Number(returnDays) : null;
    if (days !== null && (days < 7 || days > 365)) return setErr("Retorno entre 7 e 365 dias.");
    let prescription: PrescriptionInput | null = null;
    let planItems: PlanItem[] = [];
    try {
      if (outcome === "receita_emitida") prescription = validatePrescription(rx);
      planItems = validatePlan(plan);
    } catch (e) {
      return setErr((e as Error).message);
    }
    setBusy(true);
    try {
      const res = await api.doctorFinishConsultation(appointment.id, { outcome, returnDays: days, prescription, plan: planItems });
      const issued = [res.plan_document_id && "Seu Plano", res.document_id && "receita"].filter(Boolean).join(" e ");
      let text = issued ? `Consulta encerrada. ${issued[0].toUpperCase()}${issued.slice(1)} já ${res.plan_document_id && res.document_id ? "estão" : "está"} na conta do paciente.` : "Consulta encerrada.";
      if (issued) {
        try {
          const sent = await api.doctorSendDocuments(appointment.id);
          if (sent.sent_to) text += ` PDFs enviados para ${sent.sent_to}.`;
        } catch (e) {
          text += ` ${(e as Error).message}`;
        }
      }
      setMsg(text);
      onFinished();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <Spinner label="Abrindo receita" />;

  return (
    <div className="space-y-6">
      <PlanTabsBar
        tabs={[
          { key: "receita", label: kind === "nutricionista" ? "Fórmula do suplemento" : "Receita", count: rx.items.length },
          { key: "plano", label: kind === "nutricionista" ? "Seu Plano: dieta e rotina" : "Seu Plano: rotina e cuidados", count: plan.length },
        ]}
        active={view}
        onChange={(k) => setView(k as "receita" | "plano")}
      />

      {view === "plano" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            O paciente recebe o Seu Plano em PDF, separado da receita: objetivos, metas, {kind === "nutricionista" ? "cardápio, rotina" : "rotina, cuidados"} e exames pedidos.
            Clique nos itens da sua biblioteca ou nas sugestões para adicionar.
          </p>
          <PlanEditor kind={kind} items={plan} onChange={setPlan} templates={templates ?? []} disabled={done} />
        </div>
      )}

      {view === "receita" && (
        <>
          <div>
            <p className="font-semibold">Receita do paciente</p>
            <p className="text-sm text-muted">Adicione os componentes durante a consulta. Prescreva ativo e dose, sem marca e sem indicar farmácia.</p>
          </div>

          {!done && actives && <ActivePicker actives={actives} onPick={(a) => addItem({ name: a.name, dose: a.default_dose ?? "" })} />}

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead className="bg-primary-soft/50 text-sm text-muted">
                <tr>
                  <th className="w-10 px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Componente (ativo)</th>
                  <th className="w-40 px-3 py-2 font-medium">Dose por unidade</th>
                  <th className="w-12 px-3 py-2" aria-label="Remover" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rx.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      Nenhum componente ainda.
                    </td>
                  </tr>
                )}
                {rx.items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Input aria-label={`Componente ${i + 1}`} value={it.name} disabled={done} onChange={(e) => setItem(i, { name: e.target.value })} className="h-10" />
                    </td>
                    <td className="px-3 py-2">
                      <Input aria-label={`Dose ${i + 1}`} value={it.dose} disabled={done} placeholder="ex.: 100 mg" onChange={(e) => setItem(i, { dose: e.target.value })} className="h-10" />
                    </td>
                    <td className="px-3 py-2">
                      {!done && (
                        <button type="button" onClick={() => removeItem(i)} className="rounded-lg p-2 text-muted hover:text-danger" aria-label={`Remover componente ${i + 1}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!done && (
            <Button variant="secondary" size="sm" onClick={() => addItem({ name: "", dose: "" })}>
              <Plus className="h-4 w-4" /> Adicionar componente
            </Button>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forma" htmlFor="rx-form">
              <Input id="rx-form" value={rx.form} disabled={done} placeholder="ex.: cápsulas, sachês" onChange={(e) => setRx({ ...rx, form: e.target.value })} />
            </Field>
            <Field label="Quantidade total" htmlFor="rx-qty">
              <Input id="rx-qty" value={rx.quantity} disabled={done} placeholder="ex.: 60 cápsulas" onChange={(e) => setRx({ ...rx, quantity: e.target.value })} />
            </Field>
          </div>
          <Field label="Modo de uso" htmlFor="rx-dir">
            <Textarea id="rx-dir" value={rx.directions} disabled={done} placeholder="ex.: tomar 1 cápsula ao dia, após o café da manhã" onChange={(e) => setRx({ ...rx, directions: e.target.value })} />
          </Field>
        </>
      )}

      {!done && (
        <>
          <Button variant="secondary" onClick={saveDraft}>
            Salvar rascunho da receita e do Seu Plano
          </Button>

          <div className="space-y-3 border-t border-border pt-5">
            <p className="font-semibold">Encerrar consulta</p>
            <select
              aria-label="Desfecho"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as OutcomeKind)}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Field label="Retorno sugerido em (dias, opcional)" htmlFor="ret">
              <Input id="ret" type="number" min={7} max={365} value={returnDays} onChange={(e) => setReturnDays(e.target.value)} className="max-w-[160px]" />
            </Field>
            <Button onClick={finish} loading={busy}>
              Encerrar consulta e enviar ao paciente
            </Button>
            <p className="text-xs text-muted">
              O paciente recebe na conta e por e-mail dois PDFs: o Seu Plano{plan.length ? ` (${plan.length} itens)` : " (vazio, não será enviado)"} e a receita
              {outcome === "receita_emitida" ? "" : " (não será emitida com este desfecho)"}.
            </p>
            <p className="text-xs text-muted">O valor que você recebe é o mesmo com ou sem receita.</p>
          </div>
        </>
      )}

      {err && <Notice tone="danger">{err}</Notice>}
      {msg && <Notice tone="success">{msg}</Notice>}
    </div>
  );
}

/** Tabela de ativos: lista privada do médico, usada para montar receitas mais rápido. */
function ActivesManager() {
  const { data, loading, error, reload } = useAsync(() => api.doctorListActives(), []);
  const [form, setForm] = useState({ id: undefined as string | undefined, name: "", default_dose: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    try {
      await api.doctorSaveActive({ id: form.id, name: form.name, default_dose: form.default_dose || null, notes: form.notes || null });
      setForm({ id: undefined, name: "", default_dose: "", notes: "" });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function remove(id: string) {
    setErr(null);
    try {
      await api.doctorDeleteActive(id);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-card border border-border">
          {loading && <Spinner />}
          {error && <Notice tone="danger">{error}</Notice>}
          {data && (
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead className="bg-primary-soft/50 text-sm text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Ativo</th>
                  <th className="px-4 py-2 font-medium">Dose habitual</th>
                  <th className="px-4 py-2 font-medium">Observação</th>
                  <th className="w-28 px-4 py-2" aria-label="Ações" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Nenhum ativo cadastrado ainda.
                    </td>
                  </tr>
                )}
                {data.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 tabular-nums">{a.default_dose ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{a.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-sm text-primary hover:bg-primary-soft"
                          onClick={() => setForm({ id: a.id, name: a.name, default_dose: a.default_dose ?? "", notes: a.notes ?? "" })}
                        >
                          Editar
                        </button>
                        <button type="button" className="rounded-lg p-1.5 text-muted hover:text-danger" onClick={() => remove(a.id)} aria-label={`Remover ${a.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Card className="space-y-4 self-start">
          <p className="font-semibold">{form.id ? "Editar ativo" : "Novo ativo"}</p>
          <Field label="Nome do ativo" htmlFor="at-name">
            <Input id="at-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Dose habitual (opcional)" htmlFor="at-dose">
            <Input id="at-dose" value={form.default_dose} placeholder="ex.: 100 mg" onChange={(e) => setForm({ ...form, default_dose: e.target.value })} />
          </Field>
          <Field label="Observação (opcional)" htmlFor="at-notes">
            <Textarea id="at-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save}>{form.id ? "Salvar" : "Adicionar"}</Button>
            {form.id && (
              <Button variant="ghost" onClick={() => setForm({ id: undefined, name: "", default_dose: "", notes: "" })}>
                Cancelar
              </Button>
            )}
          </div>
          {err && <Notice tone="danger">{err}</Notice>}
        </Card>
      </div>
    </div>
  );
}

/** Minha biblioteca: ativos da receita e itens prontos do "Seu Plano" (dieta, rotina, cuidados, metas, exames). */
export function PanelActives() {
  const { professional } = useAuth();
  const kind: ProKind = professional?.kind ?? "medico";
  const tabs = [{ key: "ativos", label: "Ativos da receita", sections: [] as PlanSection[] }, ...planTabs(kind)];
  const [tab, setTab] = useState("ativos");
  const current = tabs.find((t) => t.key === tab) ?? tabs[0];
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Minha biblioteca</h1>
        <p className="mt-1 text-muted">
          Só você vê esta biblioteca. Deixe salvos os ativos, {kind === "nutricionista" ? "as opções de refeição, a rotina" : "a rotina, os cuidados"}, metas e exames que
          você mais usa: na consulta, é só clicar para adicionar à receita ou ao Seu Plano do paciente.
        </p>
      </div>
      <div className="mb-6">
        <PlanTabsBar tabs={tabs} active={tab} onChange={setTab} />
      </div>
      {current.key === "ativos" ? <ActivesManager /> : <TemplatesManager key={current.key} sections={current.sections} />}
    </div>
  );
}
