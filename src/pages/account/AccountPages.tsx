import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, FileText, Video } from "lucide-react";
import { Badge, Button, ButtonLink, Card, Notice, Spinner } from "@/components/ui";
import { PharmacyChoice, PrescriptionSummary } from "@/components/PharmacyChoice";
import { PlanSummary } from "@/components/PlanSummary";
import { useAsync } from "@/hooks/useData";
import { useFlow } from "@/context/FlowContext";
import { api, isDemo, type Appointment, type AppointmentStatus, type ClinicalDocument, type DocumentKind } from "@/lib/api";
import { canCancelFree, canJoin } from "@/lib/schedule";
import { formatBRL, formatDateTime } from "@/lib/utils";
import { company, policy } from "@/config/site";
import { careLineContent, type CareLineSlug } from "@/content/careLines";

const STATUS_LABEL: Record<AppointmentStatus, { label: string; tone: "neutral" | "primary" | "warning" | "danger" | "success" }> = {
  reservado: { label: "Aguardando pagamento", tone: "warning" },
  pago: { label: "Pago", tone: "primary" },
  confirmado: { label: "Confirmada", tone: "primary" },
  realizado: { label: "Realizada", tone: "success" },
  nao_compareceu: { label: "Não compareceu", tone: "danger" },
  cancelado: { label: "Cancelada", tone: "neutral" },
  estornado: { label: "Estornada", tone: "neutral" },
  expirado: { label: "Expirada", tone: "neutral" },
};

const DOC_LABEL: Record<DocumentKind, string> = {
  receita: "Receita",
  orientacao: "Orientações",
  pedido_exame: "Pedido de exame",
  encaminhamento: "Encaminhamento",
  plano: "Seu Plano",
};

function lineName(slug: string) {
  return careLineContent[slug as CareLineSlug]?.name ?? slug;
}

/* Consultas ---------------------------------------------------------------------- */
export function MyAppointments() {
  const navigate = useNavigate();
  const flow = useFlow();
  const { data, loading, error, reload: reloadAppointments } = useAsync(() => api.listMyAppointments(), []);
  const { data: docs, reload: reloadDocs } = useAsync(() => api.listMyDocuments(), []);
  const reload = () => {
    reloadAppointments();
    reloadDocs();
  };
  const [msg, setMsg] = useState<{ tone: "success" | "warning" | "danger"; text: string } | null>(null);

  if (loading) return <Spinner />;
  if (error) return <Notice tone="danger">{error}</Notice>;

  const now = Date.now();
  const upcoming = (data ?? []).filter((a) => new Date(a.ends_at).getTime() >= now && ["reservado", "pago", "confirmado"].includes(a.status));
  const past = (data ?? []).filter((a) => !upcoming.includes(a));
  const lastDone = past.find((a) => a.status === "realizado");
  // Receita emitida nos últimos 30 dias aparece em destaque logo após a consulta.
  // Documentos da última consulta (até 30 dias) aparecem em destaque.
  const recent = (kind: DocumentKind) => (docs ?? []).find((d) => d.kind === kind && now - new Date(d.issued_at).getTime() < 30 * 86400_000);
  const latestRx = recent("receita");
  const latestPlan = recent("plano");

  async function cancel(a: Appointment, reschedule: boolean) {
    setMsg(null);
    try {
      const res = await api.cancelAppointment(a.id);
      if (res.charged) {
        setMsg({ tone: "warning", text: `Faltam menos de ${policy.freeRescheduleHours} horas: a consulta é cobrada e o horário continua reservado para você.` });
        return;
      }
      if (reschedule) {
        flow.setCareLine(a.care_line);
        flow.setTriageResponseId(a.triage_response_id);
        flow.setKind(a.kind);
        navigate("/comecar/agenda");
        return;
      }
      setMsg({ tone: "success", text: a.status === "reservado" ? "Reserva cancelada." : "Consulta cancelada. O estorno será feito no mesmo meio de pagamento." });
      reload();
    } catch (e) {
      setMsg({ tone: "danger", text: (e as Error).message });
    }
  }

  function bookReturn(a: Appointment) {
    flow.setCareLine(a.care_line);
    flow.setTriageResponseId(null);
    flow.setKind("retorno");
    navigate("/comecar/agenda");
  }

  return (
    <div className="space-y-8">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {(latestRx || latestPlan) && (
        <Card className="border-t-4 border-t-accent">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Consulta concluída</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {latestPlan && latestRx ? "Seu Plano e sua receita estão prontos." : latestPlan ? "Seu Plano está pronto." : "Sua receita está pronta."}
          </h2>
          <p className="mt-1 text-muted">
            {latestPlan ? "Baixe o Seu Plano em PDF: objetivos, metas, rotina e exames. " : ""}
            {latestRx ? "Na receita, escolha onde manipular: na Farmashop ou em outra farmácia." : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {latestPlan && <ButtonLink to={`/minha-conta/documentos/${latestPlan.id}`}>Ver Seu Plano</ButtonLink>}
            {latestRx && (
              <ButtonLink to={`/minha-conta/documentos/${latestRx.id}`} variant={latestPlan ? "secondary" : "primary"}>
                Ver receita e escolher a farmácia
              </ButtonLink>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Os dois PDFs também foram enviados para o seu e-mail.</p>
        </Card>
      )}

      <section>
        <h2 className="text-xl font-semibold">Próximas</h2>
        {upcoming.length === 0 ? (
          <Card className="mt-4">
            <p className="text-muted">Você não tem consultas agendadas.</p>
            <ButtonLink to="/comecar" className="mt-4">
              Agendar consulta
            </ButtonLink>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {upcoming.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatDateTime(a.starts_at)}</p>
                    <p className="text-sm text-muted">
                      {lineName(a.care_line)} · {a.kind === "retorno" ? "Retorno" : "Consulta"} · {a.professional?.full_name}
                    </p>
                  </div>
                  <Badge tone={STATUS_LABEL[a.status].tone}>{STATUS_LABEL[a.status].label}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {a.status === "reservado" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        flow.setAppointmentId(a.id);
                        navigate("/comecar/pagamento");
                      }}
                    >
                      Pagar agora
                    </Button>
                  )}
                  {a.status === "confirmado" && (
                    <a
                      href={a.room_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!canJoin(a.starts_at, a.ends_at) || !a.room_url}
                      className={
                        canJoin(a.starts_at, a.ends_at) && a.room_url
                          ? "inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-ink no-underline"
                          : "pointer-events-none inline-flex h-9 items-center gap-2 rounded-full bg-border px-4 text-sm font-medium text-muted no-underline"
                      }
                    >
                      <Video className="h-4 w-4" /> Entrar na consulta
                    </a>
                  )}
                  {["pago", "confirmado"].includes(a.status) && canCancelFree(a.starts_at) && (
                    <Button size="sm" variant="secondary" onClick={() => cancel(a, true)}>
                      Remarcar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => cancel(a, false)}>
                    Cancelar
                  </Button>
                </div>
                {a.status === "confirmado" && !canJoin(a.starts_at, a.ends_at) && (
                  <p className="mt-3 text-xs text-muted">O botão de entrar libera {policy.joinOpensMinutesBefore} minutos antes do horário.</p>
                )}
                {isDemo && a.status === "confirmado" && api.demoCompleteConsultation && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <span className="w-full text-xs text-muted">Demonstração:</span>
                    <Button size="sm" variant="ghost" onClick={async () => { await api.demoCompleteConsultation!(a.id, true); reload(); }}>
                      Simular consulta com receita
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await api.demoCompleteConsultation!(a.id, false); reload(); }}>
                      Simular consulta sem receita
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Anteriores</h2>
            {lastDone && (
              <Button size="sm" variant="secondary" onClick={() => bookReturn(lastDone)}>
                Agendar retorno
              </Button>
            )}
          </div>
          <div className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {past.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <div>
                  <p className="font-medium">{formatDateTime(a.starts_at)}</p>
                  <p className="text-sm text-muted">
                    {lineName(a.care_line)} · {a.professional?.full_name}
                  </p>
                </div>
                <Badge tone={STATUS_LABEL[a.status].tone}>{STATUS_LABEL[a.status].label}</Badge>
              </div>
            ))}
          </div>
          <Link to="/minha-conta/documentos" className="mt-3 inline-block text-sm">
            Ver documentos das consultas
          </Link>
        </section>
      )}
    </div>
  );
}

/* Documentos --------------------------------------------------------------------- */
export function MyDocuments() {
  const { data, loading, error } = useAsync(() => api.listMyDocuments(), []);
  if (loading) return <Spinner />;
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data?.length) {
    return (
      <Card>
        <p className="text-muted">Os documentos aparecem aqui depois da consulta: receita, orientações, pedido de exame ou encaminhamento.</p>
      </Card>
    );
  }
  const groups = new Map<string, ClinicalDocument[]>();
  data.forEach((d) => groups.set(d.appointment_id, [...(groups.get(d.appointment_id) ?? []), d]));

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([apptId, docs]) => (
        <section key={apptId} className="space-y-3">
          <p className="text-sm text-muted">Consulta de {formatDateTime(docs[0].issued_at)}</p>
          {!docs.some((d) => d.kind === "receita") && <NoPrescriptionNote />}
          {docs.map((d) => (
            <Link
              key={d.id}
              to={`/minha-conta/documentos/${d.id}`}
              className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5 no-underline hover:border-primary"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" aria-hidden />
                <span>
                  <span className="block font-semibold text-ink">{d.title}</span>
                  <span className="block text-sm text-muted">{DOC_LABEL[d.kind]}</span>
                </span>
              </span>
              <span className="text-sm text-primary">Abrir</span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}

export function DocumentPage() {
  const { id } = useParams();
  const { data: doc, loading } = useAsync<ClinicalDocument | null>(() => api.getDocument(id!), [id]);
  const { data: rx } = useAsync(() => api.getPrescriptionForDocument(id!), [id]);
  const { data: ctx } = useAsync(() => api.getDocumentContext(id!), [id]);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (!doc) return <Notice tone="warning">Documento não encontrado.</Notice>;

  async function download() {
    setError(null);
    try {
      const url = await api.getDocumentUrl(doc!);
      if (url) return void window.open(url, "_blank", "noopener");
      // Sem arquivo pronto no servidor: o PDF é montado aqui mesmo, no aparelho do paciente.
      const { downloadDocumentPdf } = await import("@/lib/pdf");
      if (!ctx || !downloadDocumentPdf(ctx)) throw new Error("O PDF ainda não está disponível.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/minha-conta/documentos" className="text-sm">
        ← Documentos
      </Link>
      <div>
        <p className="text-sm text-muted">
          {DOC_LABEL[doc.kind]} · {formatDateTime(doc.issued_at)}
        </p>
        <h2 className="text-2xl font-semibold">{doc.title}</h2>
      </div>
      {doc.kind === "plano" ? (
        <>
          <Card className="border-t-4 border-t-accent">
            <p className="text-muted">
              {ctx?.professional ? `Montado por ${ctx.professional.full_name} na sua consulta.` : "Montado na sua consulta."} Baixe, imprima ou mostre para quem
              vai te acompanhar nessa rotina.
            </p>
            <Button className="mt-4" onClick={download}>
              <Download className="h-4 w-4" /> Baixar Seu Plano (PDF)
            </Button>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </Card>
          {ctx?.plan && (
            <Card>
              <PlanSummary items={ctx.plan.items} />
            </Card>
          )}
        </>
      ) : doc.kind === "receita" ? (
        <>
          {rx && (
            <Card>
              <PrescriptionSummary prescription={rx} />
            </Card>
          )}
          <Card>
            <PharmacyChoice document={doc} />
          </Card>
        </>
      ) : (
        <Card>
          <Button variant="secondary" onClick={download}>
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </Card>
      )}
      <p className="text-sm text-muted">
        Dúvidas sobre o documento? Fale com o atendimento: {company.supportWhatsapp} ou {company.supportEmail}.
      </p>
    </div>
  );
}

/** Estado "sem receita" aparece em Consultas quando não há documento do tipo receita. */
export function NoPrescriptionNote() {
  return (
    <Notice tone="info" title="Seu médico não indicou remédio nesta consulta.">
      As orientações estão nos seus documentos. Isso acontece em muitas consultas e é um bom sinal: tratar só quando precisa.
    </Notice>
  );
}

/* Pagamentos --------------------------------------------------------------------- */
export function MyPayments() {
  const { data, loading, error } = useAsync(() => api.listMyPayments(), []);
  if (loading) return <Spinner />;
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data?.length) return <Card><p className="text-muted">Nenhum pagamento ainda.</p></Card>;
  const label = { pendente: "Pendente", pago: "Pago", recusado: "Recusado", estornado: "Estornado", expirado: "Expirado" } as const;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-bg text-sm text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Data</th>
            <th className="px-5 py-3 font-medium">Valor</th>
            <th className="px-5 py-3 font-medium">Situação</th>
            <th className="px-5 py-3 font-medium">Nota fiscal</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="px-5 py-3">{formatDateTime(p.created_at)}</td>
              <td className="px-5 py-3">{formatBRL(p.amount_cents)}</td>
              <td className="px-5 py-3">{label[p.status]}</td>
              <td className="px-5 py-3">{p.nfse_url ? <a href={p.nfse_url} target="_blank" rel="noopener noreferrer">Baixar</a> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Meus dados (LGPD) -------------------------------------------------------------- */
export function MyData() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function exportData() {
    setBusy("export");
    setMsg(null);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-prumo.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMsg({ tone: "danger", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function requestDeletion() {
    setBusy("delete");
    setMsg(null);
    try {
      await api.requestDeletion();
      setMsg({ tone: "success", text: "Pedido registrado. Respondemos em até 15 dias pelo seu e-mail." });
      setConfirmDelete(false);
    } catch (e) {
      setMsg({ tone: "danger", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Card>
        <h2 className="text-xl font-semibold">Cadastro</h2>
        <p className="mt-2 text-muted">
          Para corrigir nome, CPF, data de nascimento ou celular, ou para revogar uma autorização, fale com o atendimento ({company.supportEmail}). Esses
          dados vão na receita, por isso a troca é conferida.
        </p>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Baixar meus dados</h2>
        <p className="mt-2 text-muted">Um arquivo com seu cadastro, autorizações, triagens, consultas e documentos.</p>
        <Button variant="secondary" size="sm" className="mt-4" loading={busy === "export"} onClick={exportData}>
          <Download className="h-4 w-4" /> Baixar arquivo
        </Button>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Pedir exclusão</h2>
        <p className="mt-2 text-muted">
          Apagamos seu cadastro e seus dados de marketing. O prontuário e os documentos clínicos ficam guardados por 20 anos, como exige a Lei 13.787/2018,
          com acesso restrito.
        </p>
        {!confirmDelete ? (
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirmDelete(true)}>
            Pedir exclusão
          </Button>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" size="sm" loading={busy === "delete"} onClick={requestDeletion}>
              Confirmar pedido de exclusão
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Voltar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Help() {
  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <h2 className="text-xl font-semibold">Atendimento</h2>
        <p className="mt-2 text-muted">
          WhatsApp {company.supportWhatsapp} · {company.supportEmail}
        </p>
        <p className="mt-2 text-sm text-muted">Não tratamos de sintomas pelo atendimento. Dúvidas clínicas vão para o médico, na consulta ou no retorno.</p>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Ouvidoria</h2>
        <p className="mt-2 text-muted">{company.ombudsmanEmail}</p>
      </Card>
      <Notice tone="danger" title="Urgência">
        Em caso de urgência, ligue 192 (SAMU).
      </Notice>
    </div>
  );
}
