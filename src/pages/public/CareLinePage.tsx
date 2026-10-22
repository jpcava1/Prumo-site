import { Navigate } from "react-router-dom";
import { Check } from "lucide-react";
import { ButtonLink, Card, Eyebrow, Section } from "@/components/ui";
import { careLineContent, type CareLineSlug } from "@/content/careLines";
import { FaqList } from "./Home";

/** Página de entrada para anúncios de cada tema. Sem nome de ativo, sem promessa. */
export default function CareLinePage({ slug }: { slug: CareLineSlug }) {
  const c = careLineContent[slug];
  if (!c) return <Navigate to="/" replace />;

  return (
    <>
      <Section>
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow>{c.name}</Eyebrow>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{c.heroTitle}</h1>
            <p className="mt-5 text-lg text-muted">{c.heroText}</p>
            <div className="mt-8">
              {/* O motivo vai no estado da navegação, nunca na URL (sem dado de saúde em URL). */}
              <ButtonLink to="/comecar" state={{ motivo: slug }} size="lg">
                Começar
              </ButtonLink>
              <p className="mt-3 text-sm text-muted">Consulta de até 30 minutos, por vídeo</p>
            </div>
          </div>
          <Card>
            <p className="font-semibold">Para quem é</p>
            <ul className="mt-4 space-y-3">
              {c.forWho.map((f) => (
                <li key={f} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>
      <Section className="bg-surface">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">O que o médico avalia</h2>
            <ul className="mt-6 space-y-3">
              {c.doctorLooksAt.map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-muted">
              Nem toda consulta termina em receita. O médico decide com você o melhor caminho, que pode ser orientação, exame, tratamento ou
              encaminhamento.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Perguntas sobre {c.name.toLowerCase()}</h2>
            <div className="mt-6">
              <FaqList items={c.faq} />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
