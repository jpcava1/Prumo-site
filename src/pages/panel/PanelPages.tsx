import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Badge, Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { useAsync } from "@/hooks/useData";
import { api, type Appointment, type CareLine, type Professional, type Role, type TriageForDoctor } from "@/lib/api";
import { maskCPF } from "@/lib/cpf";
import { breakEvenConsults, contributionCents, defaultFirstConsult, defaultReturnConsult } from "@/lib/pricing";
import { validateDefinition } from "@/lib/triage/schema";
import { visibleQuestions } from "@/lib/triage/engine";
import { formatBRL, formatDateTime, formatTime } from "@/lib/utils";
import { careLineContent, type CareLineSlug } from "@/content/careLines";
import { PrescriptionBuilder } from "./DoctorPrescription";

export { PanelActives } from "./DoctorPrescription";

const lineName = (s: string) => careLineContent[s as CareLineSlug]?.name ?? s;
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function H1({ children, sub }: { children: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

/* Agenda da equipe (sem triagem, sem documento clínico) --------------------------- */
export function PanelAgenda() {
  const [range] = useState(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: new Date(from.getTime() + 8 * 86400_000).toISOString() };
  });
  const { data, loading, error, reload } = useAsync(() => api.adminListAppointments(range.from, range.to), []);

  async function setStatus(a: Appointment, s: "nao_compareceu" | "estornado" | "realizado") {
    await api.adminSetAppointmentStatus(a.id, s);
    reload();
  }

  return (
    <div>
      <H1 sub="Próximos 7 dias. A equipe vê agenda e contato, nunca respostas de saúde.">Agenda</H1>
      {loading && <Spinner />}
      {error && <Notice tone="danger">{error}</Notice>}
      {data && data.length === 0 && <Card><p className="text-muted">Nenhuma consulta no período.</p></Card>}
      <div className="space-y-2">
        {data?.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {formatDateTime(a.starts_at)} · {a.professional?.full_name}
                </p>
                <p className="text-sm text-muted">
                  {a.patient?.full_name ?? "Paciente"} · {a.patient?.phone ?? "sem celular"} · {a.kind === "retorno" ? "Retorno" : "Consulta"} ·{" "}
                  {formatBRL(a.price_cents)}
                </p>
              </div>
              <Badge tone={a.status === "confirmado" ? "primary" : a.status === "realizado" ? "success" : "neutral"}>{a.status}</Badge>
            </div>
            {["confirmado", "pago"].includes(a.status) && new Date(a.ends_at).getTime() < Date.now() && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStatus(a, "nao_compareceu")}>
                  Marcar não compareceu
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(a, "realizado")}>
                  Marcar realizada
                </Button>
              </div>
            )}
            {a.status === "cancelado" && (
              <div className="mt-3">
                <Button size="sm" variant="secondary" onClick={() => setStatus(a, "estornado")}>
                  Confirmar estorno feito
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* Médico: agenda, triagem (somente leitura), receita e encerramento ------------------- */
function TriageView({ t }: { t: TriageForDoctor }) {
  const qs = visibleQuestions(t.definition, t.answers);
  const fmt = (v: unknown, opts?: { value: string; label: string }[]) => {
    const one = (x: unknown) => opts?.find((o) => o.value === x)?.label ?? String(x);
    if (Array.isArray(v)) return v.map(one).join(", ") || "—";
    if (v === null || v === undefined || v === "") return "—";
    return one(v);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {t.patient.full_name ?? "Paciente"} · {t.patient.age ?? "?"} anos · sexo ao nascer: {t.patient.sex ?? "—"}
      </p>
      {t.alerts.length > 0 && (
        <Notice tone="warning" title="Alertas da triagem">
          <ul className="list-disc pl-5">
            {t.alerts.map((a) => (
              <li key={a.code}>{a.label}</li>
            ))}
          </ul>
        </Notice>
      )}
      <dl className="divide-y divide-border rounded-card border border-border">
        {qs.map((q) => (
          <div key={q.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1.2fr]">
            <dt className="text-sm text-muted">{q.label}</dt>
            <dd className="text-[15px]">
              {q.type === "photos" || q.type === "files"
                ? `${Array.isArray(t.answers[q.id]) ? (t.answers[q.id] as string[]).length : 0} arquivo(s) — abrir na plataforma de atendimento`
                : q.type === "number"
                  ? `${fmt(t.answers[q.id])} ${q.unit ?? ""}`
                  : fmt(t.answers[q.id], q.options)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">Cada abertura desta triagem fica registrada na auditoria.</p>
    </div>
  );
}

export function PanelDoctor() {
  const { data, loading, error, reload } = useAsync(() => api.doctorAgenda(), []);
  const [open, setOpen] = useState<Appointment | null>(null);
  const [triage, setTriage] = useState<TriageForDoctor | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function openAppt(a: Appointment) {
    setOpen(a);
    setTriage(null);
    setErr(null);
    try {
      setTriage(await api.doctorGetTriage(a.id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <H1 sub="O valor que você recebe é fixo por consulta realizada, com ou sem receita.">Minha agenda</H1>
      {loading && <Spinner />}
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {data?.length === 0 && <Card><p className="text-muted">Sem consultas confirmadas.</p></Card>}
          {data?.map((a) => (
            <button
              key={a.id}
              onClick={() => openAppt(a)}
              className={`w-full rounded-card border p-4 text-left ${open?.id === a.id ? "border-primary bg-primary-soft/50" : "border-border bg-surface hover:border-primary"}`}
            >
              <p className="font-semibold">{formatDateTime(a.starts_at)}</p>
              <p className="text-sm text-muted">
                {lineName(a.care_line)} · {a.kind} · {a.status}
              </p>
            </button>
          ))}
        </div>
        <div>
          {!open && (
            <Card className="flex items-center gap-3 text-muted">
              <ClipboardList className="h-5 w-5" /> Escolha uma consulta para ver a triagem e montar a receita.
            </Card>
          )}
          {open && (
            <Card className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {lineName(open.care_line)} · {formatTime(open.starts_at)}
                </h2>
                {open.room_url && (
                  <a href={open.room_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium">
                    Abrir sala de atendimento
                  </a>
                )}
              </div>
              {err && <Notice tone="danger">{err}</Notice>}
              {!triage && !err && <Spinner label="Abrindo triagem" />}
              {triage && <TriageView t={triage} />}
              <div className="border-t border-border pt-5">
                <PrescriptionBuilder
                  key={open.id}
                  appointment={open}
                  onFinished={() => {
                    setOpen({ ...open, status: "realizado" });
                    reload();
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* Profissionais e horários --------------------------------------------------------- */
type ProfForm = Omit<Professional, "id"> & { id?: string };
const councilKind: Record<Professional["council"], Professional["kind"]> = { CRM: "medico", CRN: "nutricionista", CREF: "educador_fisico" };
const emptyProf: ProfForm = {
  user_id: null,
  kind: "medico",
  full_name: "",
  council: "CRM",
  council_number: "",
  council_uf: "PR",
  rqe: null,
  specialty: null,
  photo_url: null,
  bio: null,
  care_lines: [],
  active: true,
};

function AvailabilityEditor({ prof }: { prof: Professional }) {
  const [rules, setRules] = useState<{ weekday: number; start_time: string; end_time: string }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api.adminListAvailability(prof.id).then((r) => setRules(r.map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }))));
  }, [prof.id]);
  if (!rules) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Horário de Brasília. Consultas de 30 minutos dentro de cada faixa.</p>
      {rules.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select className="h-10 rounded-lg border border-border bg-surface px-2" value={r.weekday} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, weekday: Number(e.target.value) } : x)))}>
            {WEEKDAYS.map((w, idx) => (
              <option key={w} value={idx}>
                {w}
              </option>
            ))}
          </select>
          <input type="time" step={1800} className="h-10 rounded-lg border border-border bg-surface px-2" value={r.start_time} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} />
          <span>até</span>
          <input type="time" step={1800} className="h-10 rounded-lg border border-border bg-surface px-2" value={r.end_time} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, end_time: e.target.value } : x)))} />
          <button className="text-sm text-danger" onClick={() => setRules(rules.filter((_, j) => j !== i))}>
            Remover
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setRules([...rules, { weekday: 1, start_time: "08:00", end_time: "12:00" }])}>
          Adicionar faixa
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            if (rules.some((r) => r.end_time <= r.start_time)) return setMsg("Fim precisa ser depois do início.");
            await api.adminSaveAvailability(prof.id, rules);
            setMsg("Horários salvos.");
          }}
        >
          Salvar horários
        </Button>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

export function PanelProfessionals() {
  const { data, loading, reload } = useAsync(() => api.adminListProfessionals(), []);
  const [form, setForm] = useState<ProfForm | null>(null);
  const [selected, setSelected] = useState<Professional | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!form) return;
    setErr(null);
    if (!form.full_name || !form.council_number || form.council_uf.length !== 2) return setErr("Preencha nome, número do conselho e UF.");
    if (form.specialty && !form.rqe) return setErr("Especialidade só pode ser anunciada com RQE (Res. CFM 2.336/2023).");
    try {
      await api.adminUpsertProfessional(form);
      setForm(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const upd = (patch: Partial<ProfForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      <H1 sub="Confira o registro no conselho (portal do CFM ou do CRN) antes de aprovar. O valor pago por consulta fica em uma tabela separada, só para admin.">Profissionais e horários</H1>
      {loading && <Spinner />}
      <div className="space-y-2">
        {data?.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {p.full_name}{" "}
                  {p.approval === "pendente" ? (
                    <Badge tone="warning">aguardando aprovação</Badge>
                  ) : p.approval === "recusado" ? (
                    <Badge tone="danger">recusado</Badge>
                  ) : (
                    !p.active && <Badge>inativo</Badge>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {p.kind === "nutricionista" ? "Nutricionista" : p.kind === "educador_fisico" ? "Personal trainer" : "Médico(a)"} · {p.council} {p.council_number}/{p.council_uf}
                  {p.rqe ? ` · RQE ${p.rqe}` : ""}
                  {p.graduation_institution ? ` · ${p.graduation_institution}${p.graduation_year ? ` (${p.graduation_year})` : ""}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {p.approval === "pendente" && (
                  <>
                    <Button size="sm" onClick={async () => { await api.adminReviewProfessional(p.id, true); reload(); }}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="danger" onClick={async () => { await api.adminReviewProfessional(p.id, false); reload(); }}>
                      Recusar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="secondary" onClick={() => setSelected(selected?.id === p.id ? null : p)}>
                  Horários
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...p })}>
                  Editar
                </Button>
              </div>
            </div>
            {selected?.id === p.id && (
              <div className="mt-4 border-t border-border pt-4">
                <AvailabilityEditor prof={p} />
              </div>
            )}
          </Card>
        ))}
      </div>
      <Button className="mt-4" variant="secondary" onClick={() => setForm({ ...emptyProf })}>
        Adicionar profissional
      </Button>
      {form && (
        <Card className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">{form.id ? "Editar profissional" : "Novo profissional"}</h2>
          <Field label="Nome completo" htmlFor="pn">
            <Input id="pn" value={form.full_name} onChange={(e) => upd({ full_name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Conselho" htmlFor="pc">
              <select id="pc" className="h-12 w-full rounded-xl border border-border bg-surface px-3" value={form.council} onChange={(e) => upd({ council: e.target.value as Professional["council"], kind: councilKind[e.target.value as Professional["council"]] })}>
                <option value="CRM">CRM (médico)</option>
                <option value="CRN">CRN (nutricionista)</option>
                <option value="CREF">CREF (personal trainer)</option>
              </select>
            </Field>
            <Field label="Número" htmlFor="pnum">
              <Input id="pnum" value={form.council_number} onChange={(e) => upd({ council_number: e.target.value })} />
            </Field>
            <Field label="UF" htmlFor="puf">
              <Input id="puf" maxLength={2} value={form.council_uf} onChange={(e) => upd({ council_uf: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="RQE (se houver)" htmlFor="prqe">
              <Input id="prqe" value={form.rqe ?? ""} onChange={(e) => upd({ rqe: e.target.value || null })} />
            </Field>
            <Field label="Especialidade (só com RQE)" htmlFor="psp">
              <Input id="psp" value={form.specialty ?? ""} onChange={(e) => upd({ specialty: e.target.value || null })} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[15px] font-medium">Linhas que atende (nenhuma marcada = todas)</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(Object.keys(careLineContent) as CareLineSlug[]).map((slug) => (
                <label key={slug} className="flex items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    checked={form.care_lines.includes(slug)}
                    onChange={(e) => upd({ care_lines: e.target.checked ? [...form.care_lines, slug] : form.care_lines.filter((s) => s !== slug) })}
                  />
                  {careLineContent[slug].name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Foto (URL)" htmlFor="pph">
            <Input id="pph" value={form.photo_url ?? ""} onChange={(e) => upd({ photo_url: e.target.value || null })} />
          </Field>
          <Field label="Apresentação curta" htmlFor="pbio">
            <Textarea id="pbio" value={form.bio ?? ""} onChange={(e) => upd({ bio: e.target.value || null })} />
          </Field>
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={form.active} onChange={(e) => upd({ active: e.target.checked })} /> Ativo (aparece no site)
          </label>
          {err && <Notice tone="danger">{err}</Notice>}
          <div className="flex gap-2">
            <Button onClick={save}>Salvar</Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-muted">
            Para ligar o profissional ao login dele: peça que ele entre no site com o e-mail dele e depois mude o papel em “Acessos” para doctor.
          </p>
        </Card>
      )}
    </div>
  );
}

/* Linhas e preços, com a conta por consulta ------------------------------------------ */
export function PanelPrices() {
  const { data, loading, reload } = useAsync(() => api.listCareLines(), []);
  const [edit, setEdit] = useState<Record<string, { price: string; ret: string; status: CareLine["status"] }>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) setEdit(Object.fromEntries(data.map((l) => [l.slug, { price: (l.price_cents / 100).toFixed(2), ret: (l.return_price_cents / 100).toFixed(2), status: l.status }])));
  }, [data]);

  async function save(l: CareLine) {
    const e = edit[l.slug];
    const price = Math.round(Number(e.price.replace(",", ".")) * 100);
    const ret = Math.round(Number(e.ret.replace(",", ".")) * 100);
    if (!(price > 0 && ret > 0)) return setMsg("Preço inválido.");
    await api.adminUpdateCareLine(l.slug, { price_cents: price, return_price_cents: ret, status: e.status });
    setMsg(`${l.name}: salvo.`);
    reload();
  }

  return (
    <div>
      <H1 sub="Premissas: impostos 11%, gateway 4%, tecnologia R$ 6, médico R$ 60 (primeira) e R$ 40 (retorno). Validar com o contador.">Linhas e preços</H1>
      {loading && <Spinner />}
      {msg && <div className="mb-4"><Notice tone="success">{msg}</Notice></div>}
      <div className="space-y-3">
        {data?.map((l) => {
          const e = edit[l.slug];
          if (!e) return null;
          const p = Math.round(Number(e.price.replace(",", ".")) * 100) || 0;
          const r = Math.round(Number(e.ret.replace(",", ".")) * 100) || 0;
          const c1 = contributionCents(p, defaultFirstConsult);
          const c1i = contributionCents(p, { ...defaultFirstConsult, influencerRate: 0.1 });
          const c2 = contributionCents(r, defaultReturnConsult);
          const be = breakEvenConsults(1_050_000, c1);
          return (
            <Card key={l.slug} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{l.name}</p>
                <select className="h-10 rounded-lg border border-border bg-surface px-2" value={e.status} onChange={(ev) => setEdit({ ...edit, [l.slug]: { ...e, status: ev.target.value as CareLine["status"] } })}>
                  <option value="ativa">ativa</option>
                  <option value="fase2">fase 2 (oculta)</option>
                  <option value="fora">fora</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Consulta (R$)" htmlFor={`p-${l.slug}`}>
                  <Input id={`p-${l.slug}`} inputMode="decimal" value={e.price} onChange={(ev) => setEdit({ ...edit, [l.slug]: { ...e, price: ev.target.value } })} />
                </Field>
                <Field label="Retorno (R$)" htmlFor={`r-${l.slug}`}>
                  <Input id={`r-${l.slug}`} inputMode="decimal" value={e.ret} onChange={(ev) => setEdit({ ...edit, [l.slug]: { ...e, ret: ev.target.value } })} />
                </Field>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  Sobra por consulta: <strong className={c1 < 0 ? "text-danger" : ""}>{formatBRL(c1)}</strong>
                </p>
                <p>
                  Com 10% de influenciador: <strong className={c1i < 0 ? "text-danger" : ""}>{formatBRL(c1i)}</strong>
                </p>
                <p>
                  Sobra por retorno: <strong className={c2 < 0 ? "text-danger" : ""}>{formatBRL(c2)}</strong>
                </p>
              </div>
              <p className="text-xs text-muted">
                {be ? `Empate com custo fixo de R$ 10,5 mil/mês: ${be.toLocaleString("pt-BR")} consultas/mês.` : "Este preço não cobre o custo direto da consulta."}
              </p>
              <Button size="sm" onClick={() => save(l)}>
                Salvar {l.name}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* Triagem: editor de versões (diretor técnico) ----------------------------------------- */
export function PanelTriage() {
  const { data: lines } = useAsync(() => api.listCareLines(), []);
  const [line, setLine] = useState<string>("energia-e-disposicao");
  const { data: versions, reload } = useAsync(() => api.directorListTriageVersions(line), [line]);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (versions?.[0]) setText(JSON.stringify(versions[0].definition, null, 2));
  }, [versions]);

  const check = useMemo(() => {
    try {
      return validateDefinition(JSON.parse(text));
    } catch {
      return { ok: false as const, errors: ["JSON inválido."] };
    }
  }, [text]);

  async function publish() {
    setMsg(null);
    if (!check.ok) return setErrors(check.errors);
    setErrors([]);
    const v = await api.directorPublishTriage(line, check.value);
    setMsg(`Versão ${v.version} publicada. Novas triagens já usam esta versão; as antigas guardam a versão em que foram respondidas.`);
    reload();
  }

  return (
    <div>
      <H1 sub="Só o diretor técnico publica. Nada aqui pode pedir remédio, sugerir produto ou falar de dose.">Triagem — versões</H1>
      <div className="mb-4 flex flex-wrap gap-2">
        {lines?.map((l) => (
          <Button key={l.slug} size="sm" variant={l.slug === line ? "primary" : "secondary"} onClick={() => setLine(l.slug)}>
            {l.name}
          </Button>
        ))}
      </div>
      <p className="mb-2 text-sm text-muted">
        Versões: {versions?.map((v) => `v${v.version}${v.published_at ? "" : " (rascunho)"}`).join(", ") || "—"}
      </p>
      <Textarea className="min-h-[420px] font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={publish} disabled={!check.ok}>
          Publicar nova versão
        </Button>
        {check.ok ? <Badge tone="success">válida</Badge> : <Badge tone="danger">com erros</Badge>}
      </div>
      {(errors.length > 0 || !check.ok) && (
        <div className="mt-4">
          <Notice tone="danger" title="Corrija antes de publicar">
            <ul className="list-disc pl-5">
              {(errors.length ? errors : check.ok ? [] : check.errors).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
      {msg && <div className="mt-4"><Notice tone="success">{msg}</Notice></div>}
    </div>
  );
}

/* Relatórios (só agregados) ------------------------------------------------------------ */
export function PanelReports() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => ({ from: new Date(Date.now() - days * 86400_000).toISOString(), to: new Date(Date.now() + 86400_000).toISOString() }), [days]);
  const { data, loading, error } = useAsync(() => api.reportSummary(range.from, range.to), [range.from]);
  const totalChoice = data ? data.pharmacyChoice.farmashop + data.pharmacyChoice.baixou_pdf : 0;

  return (
    <div>
      <H1 sub="Só números agregados. Não existe relatório que cruze profissional com receita ou farmácia.">Relatórios</H1>
      <div className="mb-6 flex gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={d === days ? "primary" : "secondary"} onClick={() => setDays(d)}>
            {d} dias
          </Button>
        ))}
      </div>
      {loading && <Spinner />}
      {error && <Notice tone="danger">{error}</Notice>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {data.funnel.map((f) => (
              <Card key={f.step} className="p-4">
                <p className="text-sm text-muted">{f.step.replace(/_/g, " ")}</p>
                <p className="font-display text-3xl font-semibold">{f.count}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-muted">Não comparecimento</p>
              <p className="font-display text-3xl font-semibold">{(data.noShowRate * 100).toFixed(1)}%</p>
              <p className="mt-1 text-xs text-muted">Meta do piloto: abaixo de 10%.</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Escolha de farmácia na tela da receita</p>
              <p className="mt-1 text-[15px]">
                Farmashop: <strong>{data.pharmacyChoice.farmashop}</strong> · Baixou o PDF: <strong>{data.pharmacyChoice.baixou_pdf}</strong>
              </p>
              <p className="mt-1 text-xs text-muted">
                {totalChoice ? `${Math.round((data.pharmacyChoice.baixou_pdf / totalChoice) * 100)}% levaram a receita para fora — prova de que a escolha é real.` : "Sem dados ainda."}
              </p>
            </Card>
          </div>
          <Card>
            <p className="mb-3 font-semibold">Consultas por linha</p>
            {data.consultsByLine.length === 0 ? (
              <p className="text-muted">—</p>
            ) : (
              <ul className="space-y-1 text-[15px]">
                {data.consultsByLine.map((c) => (
                  <li key={c.care_line}>
                    {lineName(c.care_line)}: <strong>{c.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <p className="mb-3 font-semibold">Repasse aos profissionais (consultas realizadas × valor fixo)</p>
            {data.payouts.length === 0 ? (
              <p className="text-muted">—</p>
            ) : (
              <table className="w-full text-left text-[15px]">
                <thead className="text-sm text-muted">
                  <tr>
                    <th className="py-2 font-medium">Profissional</th>
                    <th className="py-2 font-medium">Consultas</th>
                    <th className="py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((p) => (
                    <tr key={p.professional_id} className="border-t border-border">
                      <td className="py-2">{p.full_name}</td>
                      <td className="py-2">{p.consults}</td>
                      <td className="py-2">{formatBRL(p.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* Acessos (admin) ---------------------------------------------------------------------- */
export function PanelAccess() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <div className="max-w-xl">
      <H1 sub="A pessoa precisa ter entrado no site uma vez com o e-mail dela.">Acessos</H1>
      <Card className="space-y-4">
        <Field label="E-mail" htmlFor="ae">
          <Input id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Papel" htmlFor="ar">
          <select id="ar" className="h-12 w-full rounded-xl border border-border bg-surface px-3" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="patient">patient — paciente</option>
            <option value="staff">staff — atendimento (sem acesso a dados de saúde)</option>
            <option value="doctor">doctor — médico</option>
            <option value="medical_director">medical_director — diretor técnico</option>
            <option value="admin">admin — administração (sem acesso a dados de saúde)</option>
          </select>
        </Field>
        <Button
          onClick={async () => {
            setMsg(null);
            try {
              await api.adminSetRole(email, role);
              setMsg({ tone: "success", text: "Papel atualizado." });
            } catch (e) {
              setMsg({ tone: "danger", text: (e as Error).message });
            }
          }}
        >
          Salvar
        </Button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </Card>
      <div className="mt-4 flex items-start gap-2 text-sm text-muted">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Dê o menor acesso possível. Equipe de atendimento e administração não precisam ver triagem nem documento clínico.</p>
      </div>
      <p className="mt-2 text-xs text-muted">Máscara de CPF usada nas telas da equipe: {maskCPF("12345678909")}</p>
    </div>
  );
}
