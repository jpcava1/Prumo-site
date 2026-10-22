import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ShieldCheck, Store } from "lucide-react";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";
import { careLineContent, launchSlugs } from "@/content/careLines";
import { faq } from "@/content/faq";
import { track } from "@/lib/analytics";

export const steps = [
  { title: "Responda a triagem", text: "Cerca de 5 minutos. O médico lê antes da consulta." },
  { title: "Escolha o horário", text: "Vídeo de até 30 minutos, quando for melhor para você." },
  { title: "Converse com o médico", text: "Ele avalia e decide com você o melhor caminho." },
  { title: "Receba seus documentos", text: "Ficam na sua conta. A farmácia, você escolhe." },
];

/** Etapas em linha vertical (usada em "Como funciona"). */
export function StepsLine() {
  return (
    <ol className="prumo-line space-y-7">
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <span className="prumo-dot" style={{ top: "0.35rem" }} aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Passo {i + 1}</p>
          <p className="mt-1 font-display text-xl font-medium">{s.title}</p>
          <p className="mt-1 text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-site items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-[1.3fr_1fr] md:pb-24 md:pt-24">
          <div>
            <Eyebrow>Consulta médica online</Eyebrow>
            <h1 className="text-[2.6rem] font-medium leading-[1.05] sm:text-[4rem]">
              Um médico de verdade, <span className="italic text-accent">sem sair de casa.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Cabelo, pele, sono e energia. Consulta por vídeo de até 30 minutos, com médico de nome e CRM na tela.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink to="/comecar" size="lg" onClick={() => track("comecar_click")}>
                Começar <ArrowRight className="h-5 w-5" aria-hidden />
              </ButtonLink>
              <ButtonLink to="/como-funciona" size="lg" variant="ghost">
                Como funciona
              </ButtonLink>
            </div>
          </div>

          {/* Resumo da consulta */}
          <div className="rounded-[24px] border border-border border-t-4 border-t-accent bg-white p-8 text-ink shadow-[0_30px_60px_-34px_rgb(var(--deep)/0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">Sua consulta</p>
            <dl className="mt-6 divide-y divide-border">
              {[
                ["Formato", "Vídeo, com médico identificado"],
                ["Duração", "Até 30 minutos"],
                ["Depois da consulta", "Seu Plano e receita em PDF"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <Section className="border-y border-border bg-white">
        <div className="mb-12 max-w-xl">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="text-3xl font-medium sm:text-[2.6rem]">Quatro passos, tudo online.</h2>
        </div>
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-accent-deep pt-5">
              <p className="font-display text-4xl font-medium text-sky tabular-nums">{i + 1}</p>
              <p className="mt-3 text-lg font-semibold">{s.title}</p>
              <p className="mt-1 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Linhas de cuidado */}
      <Section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <Eyebrow>Por onde começar</Eyebrow>
            <h2 className="text-3xl font-medium sm:text-[2.6rem]">Escolha o motivo da consulta</h2>
          </div>
          <Link to="/o-que-nao-atendemos" className="text-sm text-muted">
            O que não atendemos
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {launchSlugs.map((slug) => {
            const c = careLineContent[slug];
            return (
              <Link
                key={slug}
                to={`/${slug}`}
                className="group flex flex-col justify-between gap-8 rounded-card border border-border bg-surface p-6 no-underline transition-all hover:-translate-y-0.5 hover:border-primary"
              >
                <div>
                  <p className="font-display text-2xl font-medium text-ink">{c.name}</p>
                  <p className="mt-2 text-muted">{c.short}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-accent transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Confiança */}
      <Section className="bg-cream">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Médico com CRM", text: "Você vê quem vai atender antes de agendar." },
            { icon: Store, title: "A farmácia é sua escolha", text: "A receita sai no seu nome e vale no Brasil todo." },
            { icon: ShieldCheck, title: "Dados protegidos", text: "Só o seu médico vê suas respostas de saúde." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon className="h-7 w-7 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted">
          Regras, registros e responsáveis na página de <Link to="/transparencia">transparência</Link>.
        </p>
      </Section>

      {/* Dúvidas */}
      <Section>
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>Dúvidas</Eyebrow>
            <h2 className="text-3xl font-medium sm:text-[2.6rem]">Perguntas frequentes</h2>
            <Link to="/perguntas" className="mt-4 inline-block text-sm font-medium">
              Ver todas
            </Link>
          </div>
          <FaqList items={faq.slice(0, 3)} />
        </div>
      </Section>

      {/* CTA final */}
      <Section>
        <div className="rounded-[24px] border border-border border-t-4 border-t-accent-deep bg-white px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-medium text-ink sm:text-[2.6rem]">Sua saúde no prumo.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Triagem de 5 minutos e consulta por vídeo.</p>
          <ButtonLink to="/comecar" size="lg" className="mt-8 bg-accent text-white hover:bg-accent-deep">
            Começar agora
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
            {f.q}
            <span className="text-2xl font-light text-accent transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
