import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { Button, ButtonLink, Card, Spinner } from "@/components/ui";
import { useFlow } from "@/context/FlowContext";
import { api, type Appointment } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { policy } from "@/config/site";
import { track } from "@/lib/analytics";

export default function StepConfirmado() {
  const flow = useFlow();
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (flow.appointmentId) {
      api.getAppointment(flow.appointmentId).then((a) => {
        setAppt(a);
        track("fluxo_concluido");
      });
    }
  }, [flow.appointmentId]);

  if (!flow.appointmentId) return <Navigate to="/minha-conta" replace />;
  if (!appt) return <Spinner />;

  return (
    <Card className="text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
      <h1 className="mt-4 text-3xl font-semibold">Consulta confirmada</h1>
      <p className="mt-3 text-lg">{formatDateTime(appt.starts_at)}</p>
      <p className="text-muted">
        com {appt.professional?.full_name} · {appt.professional?.council} {appt.professional?.council_number}/{appt.professional?.council_uf}
      </p>
      <div className="mx-auto mt-6 max-w-md space-y-2 text-left text-[15px] text-ink/90">
        <p>• O botão “Entrar na consulta” aparece na sua conta {policy.joinOpensMinutesBefore} minutos antes.</p>
        <p>• Avisamos por e-mail e WhatsApp 24 horas e 1 hora antes.</p>
        <p>• Use fone, um lugar reservado e boa conexão.</p>
        <p>• Precisa remarcar? Grátis até {policy.freeRescheduleHours} horas antes, pela sua conta.</p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => downloadIcs(buildIcs({ id: appt.id, startsAt: appt.starts_at, endsAt: appt.ends_at, url: `${window.location.origin}/minha-conta` }))}
        >
          <CalendarPlus className="h-5 w-5" /> Adicionar à agenda
        </Button>
        <ButtonLink to="/minha-conta" size="lg" onClick={() => flow.reset()}>
          Ir para minha conta
        </ButtonLink>
      </div>
    </Card>
  );
}
