import type { ReactNode } from "react";
import { Notice, PageTitle, Section } from "@/components/ui";
import { company, legalVersions, policy } from "@/config/site";

/**
 * Textos legais — RASCUNHOS ESTRUTURAIS.
 * Precisam ser escritos/revisados pelo advogado (direito sanitário, médico e LGPD) antes do lançamento.
 * Ao mudar um texto, suba a versão em src/config/site.ts (legalVersions): o aceite é gravado com ela.
 */

function LegalShell({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <Section>
      <PageTitle eyebrow="Documento legal" title={title}>
        Versão {version}
      </PageTitle>
      <div className="mt-8 max-w-3xl space-y-6 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        <Notice tone="warning" title="Rascunho">
          Texto-base para revisão jurídica. Não publique sem a aprovação do advogado.
        </Notice>
        {children}
      </div>
    </Section>
  );
}

export function Terms() {
  return (
    <LegalShell title="Termos de uso" version={legalVersions.termos}>
      <h2>1. Quem somos</h2>
      <p>
        {company.legalName}, CNPJ {company.cnpj}, clínica de telemedicina registrada no Conselho Regional de Medicina ({company.crmRegistration}).
      </p>
      <h2>2. O que oferecemos</h2>
      <p>Consulta médica por vídeo, agendada, de até {policy.consultMinutes} minutos. Não vendemos medicamentos e não somos farmácia.</p>
      <h2>3. Decisão médica</h2>
      <p>
        O médico decide, com autonomia, se há indicação de tratamento, exame, orientação ou encaminhamento presencial. A consulta não garante a emissão
        de receita.
      </p>
      <h2>4. Livre escolha da farmácia</h2>
      <p>
        A receita é do paciente e pode ser usada em qualquer farmácia. A indicação de uma farmácia integrada é apenas uma opção de conveniência, sem
        obrigação de compra.
      </p>
      <h2>5. Quem pode usar</h2>
      <ul>
        <li>Maiores de 18 anos.</li>
        <li>Situações que não sejam de urgência ou emergência.</li>
      </ul>
      <h2>6. Pagamento, cancelamento e reembolso</h2>
      <p>Conforme a política de cancelamento.</p>
      <h2>7. Foro e contato</h2>
      <p>[PREENCHER com o advogado]</p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Política de privacidade" version={legalVersions.privacidade}>
      <h2>Controlador e encarregado</h2>
      <p>
        {company.legalName}. Encarregado de dados: {company.dpo.name} ({company.dpo.email}).
      </p>
      <h2>Que dados tratamos e para quê</h2>
      <ul>
        <li>Cadastro (nome, CPF, nascimento, celular, e-mail): identificar você e cumprir exigências legais da prescrição.</li>
        <li>Dados de saúde (triagem, fotos, prontuário): prestar o atendimento médico, com o seu consentimento específico (LGPD, art. 11).</li>
        <li>Pagamento: cobrar a consulta e emitir nota fiscal.</li>
        <li>Navegação nas páginas públicas: só com o seu aceite de cookies.</li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <p>
        Com a plataforma de telemedicina certificada, o meio de pagamento e o emissor de nota fiscal, só no necessário. Não compartilhamos dados de saúde
        com farmácias: se você escolher uma farmácia, é você quem envia a receita a ela.
      </p>
      <h2>Por quanto tempo</h2>
      <ul>
        <li>Prontuário e documentos clínicos: 20 anos (Lei 13.787/2018).</li>
        <li>Triagem de quem não agendou consulta: apagada em 90 dias.</li>
        <li>Dados de marketing: até você revogar.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>Acessar, corrigir, baixar seus dados, revogar consentimentos e pedir exclusão, pela área “Meus dados” ou pelo e-mail do encarregado.</p>
      <h2>Onde ficam os dados</h2>
      <p>Em servidores no Brasil (região São Paulo), com acesso restrito e registro de quem acessou.</p>
    </LegalShell>
  );
}

export function Tcle() {
  return (
    <LegalShell title="Termo de consentimento da telemedicina" version={legalVersions.tcle}>
      <p>Ao aceitar este termo, declaro que:</p>
      <ul>
        <li>Fui informado de que a consulta será por vídeo, nos termos da Lei 14.510/2022 e da Resolução CFM 2.314/2022.</li>
        <li>Entendo que o atendimento a distância tem limites, como a falta de exame físico, e que o médico pode indicar atendimento presencial.</li>
        <li>Autorizo a transmissão das minhas imagens e dados durante a consulta e o registro no prontuário eletrônico.</li>
        <li>Sei que a decisão sobre prescrever ou não é do médico, e que a receita é minha e pode ser usada em qualquer farmácia.</li>
        <li>Em caso de urgência, devo procurar atendimento presencial ou ligar 192.</li>
      </ul>
    </LegalShell>
  );
}

export function Cancellation() {
  return (
    <LegalShell title="Cancelamento e reembolso" version={legalVersions.cancelamento}>
      <ul>
        <li>Remarcar ou cancelar até {policy.freeRescheduleHours} horas antes: sem custo, com estorno integral.</li>
        <li>Menos de {policy.freeRescheduleHours} horas antes, ou não entrar na consulta em até {policy.noShowAfterMinutes} minutos: a consulta é cobrada.</li>
        <li>Médico atrasado mais de 10 minutos ou ausente: você escolhe entre remarcação prioritária ou estorno integral.</li>
        <li>Se o médico encerrar porque o caso exige atendimento presencial, a consulta é cobrada e o retorno com o exame ou a avaliação é gratuito.</li>
        <li>Estornos de cartão seguem o prazo da operadora; Pix é devolvido em até 5 dias úteis. [CONFIRMAR com o gateway]</li>
      </ul>
    </LegalShell>
  );
}
