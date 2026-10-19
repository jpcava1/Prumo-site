import { Link } from "react-router-dom";
import { ButtonLink, Card, Eyebrow, PageTitle, Section } from "@/components/ui";
import { StepsLine } from "./Home";
import { pharmacyPartner } from "@/config/site";

export default function HowItWorks() {
  return (
    <>
      <Section>
        <PageTitle eyebrow="Como funciona" title="Uma consulta de verdade, do começo ao fim online.">
          Você conta o que está acontecendo, escolhe o horário e conversa com um médico por vídeo. Os documentos ficam na sua conta.
        </PageTitle>
        <div className="mt-12 grid gap-10 md:grid-cols-[1fr_1fr]">
          <StepsLine />
          <div className="space-y-4">
            <Card>
              <h2 className="text-xl font-semibold">Vou sair com uma receita?</h2>
              <p className="mt-2 text-muted">
                Só se o médico entender que há indicação. Ele pode prescrever, orientar mudanças de hábito, pedir exames ou recomendar uma consulta
                presencial. O valor da consulta é o mesmo em qualquer caso, e o médico recebe o mesmo valor também.
              </p>
            </Card>
            <Card>
              <h2 className="text-xl font-semibold">E se houver receita?</h2>
              <p className="mt-2 text-muted">
                Ela sai no seu nome, em PDF com assinatura digital, e vale em qualquer farmácia do Brasil. Se preferir, a {pharmacyPartner.name}{" "}
                recebe a receita pelo site dela, faz o orçamento e entrega em casa. Usar é opcional.
              </p>
            </Card>
            <Card>
              <h2 className="text-xl font-semibold">Quanto tempo leva?</h2>
              <p className="mt-2 text-muted">
                A triagem leva cerca de 5 minutos. A consulta dura até 30 minutos. Os documentos aparecem na sua conta logo depois.
              </p>
            </Card>
          </div>
        </div>
      </Section>
      <Section className="bg-surface">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Eyebrow>O que o médico pode decidir</Eyebrow>
            <p className="text-muted">Nenhum caminho é automático. Quem decide é o médico, junto com você.</p>
          </div>
          {[
            ["Orientar", "Mudanças de hábito, rotina e cuidados, sem remédio."],
            ["Prescrever ou pedir exames", "Receita digital ou pedido de exame, quando houver indicação."],
            ["Encaminhar", "Quando o caso precisa de exame físico ou de um especialista presencial."],
          ].map(([t, d]) => (
            <Card key={t}>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/comecar" size="lg">
            Começar
          </ButtonLink>
          <ButtonLink to="/o-que-nao-atendemos" size="lg" variant="ghost">
            O que não atendemos
          </ButtonLink>
        </div>
        <p className="mt-6 text-sm text-muted">
          Dúvidas sobre dados e regras? Veja a página de <Link to="/transparencia">transparência</Link>.
        </p>
      </Section>
    </>
  );
}
