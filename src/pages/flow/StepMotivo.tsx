import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Notice, Spinner } from "@/components/ui";
import { useFlow } from "@/context/FlowContext";
import { useCareLines } from "@/hooks/useData";
import { track } from "@/lib/analytics";

export default function StepMotivo() {
  const navigate = useNavigate();
  const location = useLocation();
  const flow = useFlow();
  const { data, loading, error } = useCareLines();
  const preset = (location.state as { motivo?: string } | null)?.motivo;

  useEffect(() => {
    track("fluxo_etapa_motivo");
  }, []);

  useEffect(() => {
    if (preset && data?.some((l) => l.slug === preset && l.status === "ativa")) {
      flow.setCareLine(preset);
      flow.setKind("primeira");
      navigate("/comecar/conta", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, data]);

  const choose = (slug: string) => {
    flow.setCareLine(slug);
    flow.setKind("primeira");
    navigate("/comecar/conta");
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">Qual é o motivo da consulta?</h1>
      <p className="mt-2 text-muted">Escolha o tema principal. Você conta os detalhes na triagem.</p>
      {loading && <Spinner />}
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="mt-8 grid gap-3">
        {data
          ?.filter((l) => l.status === "ativa")
          .map((l) => (
            <button
              key={l.slug}
              onClick={() => choose(l.slug)}
              className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5 text-left transition-colors hover:border-primary"
            >
              <span>
                <span className="block font-display text-xl font-semibold">{l.name}</span>
                <span className="block text-muted">{l.short}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                <ArrowRight className="h-5 w-5 text-primary" aria-hidden />
              </span>
            </button>
          ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Não encontrou o seu caso? Veja <Link to="/o-que-nao-atendemos">o que não atendemos</Link>.
      </p>
    </div>
  );
}
