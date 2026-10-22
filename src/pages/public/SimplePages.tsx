import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { ButtonLink, Card, Notice, PageTitle, Section } from "@/components/ui";
import { notServed } from "@/content/careLines";
import { faq } from "@/content/faq";
import { FaqList } from "./Home";

export function NotServed() {
  return (
    <Section>
      <PageTitle eyebrow="Limites do serviço" title="O que não atendemos — e por quê.">
        Algumas situações precisam de exame físico, acompanhamento presencial ou regras que a consulta online não permite cumprir com segurança.
      </PageTitle>
      <div className="mt-10 grid gap-3 md:grid-cols-2">
        {notServed.map((n) => (
          <Card key={n} className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
            <span>{n}</span>
          </Card>
        ))}
      </div>
      <div className="mt-10 max-w-3xl space-y-4">
        <Notice tone="danger" title="Urgência">
          Dor no peito, falta de ar, desmaio, fraqueza de um lado do corpo ou sangramento que não para: ligue 192 (SAMU) ou vá ao pronto-socorro.
        </Notice>
        <Notice tone="info" title="Precisa de apoio emocional agora?">
          O CVV atende 24 horas, de graça, pelo telefone 188 ou pelo site cvv.org.br.
        </Notice>
        <p className="text-muted">
          Remédios controlados não podem ser vendidos a distância, e tratamentos como canetas emagrecedoras e hormônios exigem acompanhamento que este
          serviço não oferece. Nesses casos, o médico pode orientar você a procurar atendimento presencial.
        </p>
      </div>
    </Section>
  );
}

export function FaqPage() {
  return (
    <Section>
      <PageTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
      <div className="mt-10 max-w-3xl">
        <FaqList items={faq} />
      </div>
      <div className="mt-10">
        <ButtonLink to="/comecar" size="lg">
          Começar
        </ButtonLink>
      </div>
    </Section>
  );
}

/** Conteúdo educativo (SEO). Escreva sobre o tema, nunca sobre produto ou ativo. */
const articles = [
  { title: "Cansaço que não passa: quando é hora de procurar um médico", lead: "Os sinais que diferenciam uma semana puxada de algo que merece avaliação." },
  { title: "Começar a treinar depois dos 40: o que avaliar antes", lead: "Coração, articulações e rotina: o básico para treinar com segurança." },
  { title: "Higiene do sono: 7 ajustes antes de pensar em remédio", lead: "Rotina, luz, telas, café e álcool: o que a ciência diz." },
  { title: "Suplementar ou não? Perguntas para fazer antes", lead: "Alimentação, exames e objetivo vêm antes de qualquer suplemento." },
];

export function ContentPage() {
  return (
    <Section>
      <PageTitle eyebrow="Conteúdo" title="Para entender antes de decidir">
        Textos educativos revisados pelo nosso diretor técnico. Nada aqui substitui uma consulta.
      </PageTitle>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {articles.map((a) => (
          <Card key={a.title}>
            <p className="font-display text-xl font-semibold">{a.title}</p>
            <p className="mt-2 text-muted">{a.lead}</p>
            <p className="mt-4 text-sm text-muted">Em breve</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export function NotFound() {
  return (
    <Section>
      <PageTitle title="Página não encontrada">
        O endereço pode ter mudado. <Link to="/">Voltar para o início</Link>.
      </PageTitle>
    </Section>
  );
}
