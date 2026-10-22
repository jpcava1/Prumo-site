import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, FileSignature, ShieldCheck, Store } from "lucide-react";
import { ButtonLink, Card, Eyebrow, Section } from "@/components/ui";
import { LandingHero, LandingPanels } from "@/components/Landing";
import { careLineContent, launchSlugs } from "@/content/careLines";
import { faq } from "@/content/faq";
import { pharmacyPartner } from "@/config/site";
import { lowestPrice, useCareLines, useProfessionals } from "@/hooks/useData";
import { DoctorCard } from "./Doctors";

export const steps = [
  { title: "Conte o que está acontecendo", text: "Uma triagem rápida que o médico lê antes de falar com você." },
  { title: "Escolha o horário", text: "Vídeo de até 30 minutos, no dia e na hora que você preferir." },
  { title: "Converse com o médico", text: "Ele avalia e decide com você o melhor caminho, que pode ou não incluir remédio." },
  { title: "Receba seus documentos", text: "Receita, orientações ou pedido de exame ficam na sua conta. A farmácia, você escolhe." },
];

export function StepsLine() {
  return (
    <ol className="prumo-line space-y-7">
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <span className="prumo-dot" style={{ top: "0.35rem" }} aria-hidden />
          <p className="text-sm font-medium text-primary">Passo {i + 1}</p>
          <p className="font-display text-xl font-semibold">{s.title}</p>
          <p className="mt-1 text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  const { data: lines } = useCareLines();
  const { data: pros } = useProfessionals();
  const price = lowestPrice(lines);

  return (
    <>
      {/* Tela 1 e tela 2 da landing */}
      <LandingHero price={price} />
      <LandingPanels />

      {/* Linhas de cuidado */}
      <Section className="bg-surface">
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Por onde começar</Eyebrow>
          <h2 className="text-3xl font-semibold sm:text-4xl">Escolha o motivo da consulta</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {launchSlugs.map((slug) => {
            const c = careLineContent[slug];
            return (
              <Link key={slug} to={`/${slug}`} className="group rounded-card border border-border bg-bg p-6 no-underline transition-colors hover:border-primary">
                <p className="font-display text-2xl font-semibold text-ink">{c.name}</p>
                <p className="mt-2 text-muted">{c.short}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Saiba mais <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-muted">
          Não encontrou o seu caso? Veja <Link to="/o-que-nao-atendemos">o que não atendemos</Link>.
        </p>
      </Section>

      {/* Confiança */}
      <Section>
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Por que confiar</Eyebrow>
            <h2 className="text-3xl font-semibold sm:text-4xl">Regras cumpridas à vista.</h2>
            <p className="mt-4 text-muted">
              Médicos com registro ativo, receita com validade nacional e liberdade total para escolher onde manipular. Está tudo na página de{" "}
              <Link to="/transparencia">transparência</Link>.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BadgeCheck, title: "Médicos com nome, foto e CRM", text: "Você vê quem vai atender antes de agendar." },
              { icon: FileSignature, title: "Receita digital válida", text: "Assinatura ICP-Brasil, aceita em todo o país." },
              { icon: Store, title: "A farmácia é escolha sua", text: `A ${pharmacyPartner.name}, de Arapongas (PR), é uma opção integrada. Usar é opcional.` },
              { icon: ShieldCheck, title: "Seus dados ficam no Brasil", text: "Só o seu médico vê suas respostas de saúde." },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* Médicos */}
      {pros && pros.length > 0 && (
        <Section className="bg-surface">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Quem atende</Eyebrow>
              <h2 className="text-3xl font-semibold sm:text-4xl">Nossos médicos</h2>
            </div>
            <Link to="/medicos" className="hidden text-sm font-medium sm:block">
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pros.slice(0, 3).map((p) => (
              <DoctorCard key={p.id} p={p} />
            ))}
          </div>
        </Section>
      )}

      {/* Para quem é */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-primary-soft/40">
            <h3 className="text-2xl font-semibold">Para quem é</h3>
            <p className="mt-3 text-ink/90">
              Adultos que querem cuidar de energia e disposição, dieta, treino ou suplementação com um médico, sem fila e sem sair de casa.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-semibold">Para quem não é</h3>
            <p className="mt-3 text-ink/90">
              Urgências, menores de 18 anos, emagrecimento com remédio, saúde mental, hormônios para estética ou desempenho e remédios controlados.{" "}
              <Link to="/o-que-nao-atendemos">Entenda por quê</Link>.
            </p>
          </Card>
        </div>
      </Section>

      {/* FAQ curto */}
      <Section className="bg-surface">
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>Dúvidas</Eyebrow>
            <h2 className="text-3xl font-semibold sm:text-4xl">Perguntas frequentes</h2>
            <Link to="/perguntas" className="mt-4 inline-block text-sm font-medium">
              Ver todas as perguntas
            </Link>
          </div>
          <FaqList items={faq.slice(0, 5)} />
        </div>
      </Section>

      {/* CTA final */}
      <Section>
        <div className="rounded-[20px] bg-primary px-6 py-12 text-center text-primary-ink sm:px-12">
          <h2 className="text-3xl font-semibold text-primary-ink sm:text-4xl">Sua saúde no prumo começa com uma conversa.</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Triagem de 5 minutos, consulta por vídeo e seus documentos na sua conta.</p>
          <ButtonLink to="/comecar" size="lg" variant="secondary" className="mt-8">
            Começar agora
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-bg">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.q}
            <span className="text-primary transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
