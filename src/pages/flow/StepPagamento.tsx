import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Copy, ExternalLink } from "lucide-react";
import { Button, Card, Checkbox, Notice, Spinner } from "@/components/ui";
import { useFlow } from "@/context/FlowContext";
import { api, isDemo, type Appointment, type Payment } from "@/lib/api";
import { formatBRL, formatDateTime } from "@/lib/utils";
import { policy } from "@/config/site";
import { track } from "@/lib/analytics";

function useCountdown(until: string | null) {
  const [left, setLeft] = useState<number>(() => (until ? new Date(until).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return Math.max(0, left);
}

export default function StepPagamento() {
  const navigate = useNavigate();
  const flow = useFlow();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tcle, setTcle] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const left = useCountdown(appt?.status === "reservado" ? appt.hold_expires_at : null);

  useEffect(() => {
    track("fluxo_etapa_pagamento");
    if (flow.appointmentId) api.getAppointment(flow.appointmentId).then(setAppt);
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [flow.appointmentId]);

  useEffect(() => {
    if (appt && ["pago", "confirmado"].includes(appt.status)) navigate("/comecar/confirmado", { replace: true });
  }, [appt, navigate]);

  if (!flow.appointmentId) return <Navigate to="/comecar/agenda" replace />;
  if (!appt) return <Spinner />;

  const expired = appt.status === "reservado" && left === 0;

  function startPolling() {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      const a = await api.getAppointment(appt!.id);
      if (a) setAppt(a);
    }, 4000);
  }

  async function pay() {
    setError(null);
    if (!tcle || !cancel) return setError("Aceite o termo da telemedicina e a política de cancelamento.");
    setBusy(true);
    try {
      await api.recordConsents(["tcle", "cancelamento"]);
      const p = await api.startPayment(appt!.id);
      setPayment(p);
      startPolling();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Pagamento da consulta</h1>
      <p className="mt-2 text-muted">Você paga só a consulta. O valor é o mesmo com ou sem receita.</p>

      <Card className="mt-8">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
          <dt className="text-muted">Quando</dt>
          <dd className="font-medium">{formatDateTime(appt.starts_at)}</dd>
          <dt className="text-muted">Com</dt>
          <dd className="font-medium">
            {appt.professional?.full_name} · {appt.professional?.council} {appt.professional?.council_number}/{appt.professional?.council_uf}
          </dd>
          <dt className="text-muted">Duração</dt>
          <dd className="font-medium">até {policy.consultMinutes} minutos, por vídeo</dd>
          <dt className="text-muted">Valor</dt>
          <dd className="font-display text-2xl font-semibold">{formatBRL(appt.price_cents)}</dd>
        </dl>
      </Card>

      {expired ? (
        <div className="mt-6 space-y-4">
          <Notice tone="warning" title="A reserva expirou">
            O horário foi liberado. Escolha de novo.
          </Notice>
          <Button size="lg" className="w-full" onClick={() => navigate("/comecar/agenda")}>
            Escolher outro horário
          </Button>
        </div>
      ) : !payment ? (
        <>
          {appt.status === "reservado" && (
            <p className="mt-4 text-center text-sm text-muted">
              Horário reservado por mais {minutes}:{String(seconds).padStart(2, "0")}
            </p>
          )}
          <div className="mt-6 space-y-3">
            <Checkbox id="tcle" checked={tcle} onChange={setTcle}>
              Li e aceito o{" "}
              <Link to="/tcle" target="_blank">
                Termo de consentimento da telemedicina
              </Link>
              .
            </Checkbox>
            <Checkbox id="cancel" checked={cancel} onChange={setCancel}>
              Li a{" "}
              <Link to="/cancelamento" target="_blank">
                política de cancelamento
              </Link>
              : grátis até {policy.freeRescheduleHours} h antes.
            </Checkbox>
          </div>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} onClick={pay}>
            Pagar {formatBRL(appt.price_cents)}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">Pix ou cartão em até {policy.maxInstallments}x. Cobrança em nome da Prumo.</p>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          {payment.pix_qr_base64 && (
            <div className="flex justify-center">
              <img src={`data:image/png;base64,${payment.pix_qr_base64}`} alt="QR Code Pix" className="h-56 w-56 rounded-xl border border-border bg-white p-2" />
            </div>
          )}
          {payment.pix_copy_paste && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await navigator.clipboard?.writeText(payment.pix_copy_paste!);
                setCopied(true);
              }}
            >
              <Copy className="h-4 w-4" /> {copied ? "Código Pix copiado" : "Copiar código Pix"}
            </Button>
          )}
          {payment.invoice_url && (
            <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-[15px]">
              Pagar com cartão <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
          <Notice tone="info">Assim que o pagamento for aprovado, esta tela avança sozinha.</Notice>
          {isDemo && api.demoConfirmPayment && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await api.demoConfirmPayment!(appt.id);
                setAppt(await api.getAppointment(appt.id));
              }}
            >
              Simular pagamento aprovado (demonstração)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
