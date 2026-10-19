import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { ButtonLink, Card, Notice, PageTitle, Section, Spinner } from "@/components/ui";
import { useCareLines } from "@/hooks/useData";
import { formatBRL } from "@/lib/utils";
import { policy } from "@/config/site";

export default function Pricing() {
  const { data, loading } = useCareLines();
  const active = (data ?? []).filter((l) => l.status === "ativa");
  const first = active.length ? Math.min(...active.map((l) => l.price_cents)) : null;
  const ret = active.length ? Math.min(...active.map((l) => l.return_price_cents)) : null;

  return (
    <Section>
      <PageTitle eyebrow="Preço" title="Você paga a consulta. Só a consulta.">
        A fórmula, se houver, é orçada pela farmácia que você escolher, depois que ela vê a receita.
      </PageTitle>
      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card className="border-primary">
            <p className="text-sm font-medium text-primary">Consulta</p>
            <p className="mt-2 font-display text-5xl font-semibold">{first ? formatBRL(first) : "—"}</p>
            <ul className="mt-6 space-y-3">
              {[
                `Vídeo de até ${policy.consultMinutes} minutos, agendado`,
                "Médico com nome e CRM na tela",
                "Triagem lida pelo médico antes da conversa",
                "Receita, orientações ou pedido de exame na sua conta",
                `Pix ou cartão em até ${policy.maxInstallments}x`,
                "Nota fiscal para reembolso do plano, se ele oferecer",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink to="/comecar" size="lg" className="mt-8 w-full">
              Começar
            </ButtonLink>
          </Card>
          <Card>
            <p className="text-sm font-medium text-primary">Retorno</p>
            <p className="mt-2 font-display text-5xl font-semibold">{ret ? formatBRL(ret) : "—"}</p>
            <p className="mt-6 text-muted">
              Para quando o médico sugerir acompanhar a evolução. Até 20 minutos, com o mesmo profissional quando houver horário.
            </p>
            <div className="mt-6">
              <Notice tone="info" title="Cancelamento">
                Grátis até {policy.freeRescheduleHours} horas antes. Depois disso, ou se você não entrar na consulta, ela é cobrada.{" "}
                <Link to="/cancelamento">Ver política</Link>.
              </Notice>
            </div>
          </Card>
        </div>
      )}
      <p className="mt-8 text-sm text-muted">
        Não atendemos pelo plano de saúde. O valor é o mesmo com ou sem receita, e a Prumo não recebe nada da farmácia que você escolher.
      </p>
    </Section>
  );
}
