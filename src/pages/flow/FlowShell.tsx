import { Outlet, useLocation } from "react-router-dom";
import { Container, Progress } from "@/components/ui";

const STEPS = [
  { path: "/comecar", label: "Motivo" },
  { path: "/comecar/conta", label: "Conta" },
  { path: "/comecar/triagem", label: "Triagem" },
  { path: "/comecar/agenda", label: "Horário" },
  { path: "/comecar/pagamento", label: "Pagamento" },
  { path: "/comecar/confirmado", label: "Pronto" },
];

function StepHeader() {
  const { pathname } = useLocation();
  const idx = Math.max(0, STEPS.findIndex((s) => s.path === pathname));
  return (
    <div className="border-b border-border bg-surface">
      <Container className="py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">
            Etapa {idx + 1} de {STEPS.length} · {STEPS[idx].label}
          </span>
          <span className="text-muted">Leva cerca de 6 minutos</span>
        </div>
        <Progress value={((idx + 1) / STEPS.length) * 100} label="Progresso do agendamento" />
      </Container>
    </div>
  );
}

/** O FlowProvider fica no App (a área do paciente também inicia remarcação e retorno). */
export default function FlowShell() {
  return (
    <>
      <StepHeader />
      <Container className="max-w-2xl py-10">
        <Outlet />
      </Container>
    </>
  );
}
