import { Card, PageTitle, Section } from "@/components/ui";
import { company, pharmacyPartner } from "@/config/site";

export default function Transparency() {
  const rows: [string, string][] = [
    ["Empresa", `${company.legalName} · CNPJ ${company.cnpj}`],
    ["Registro no Conselho", company.crmRegistration],
    ["Diretor técnico", `${company.technicalDirector.name} · ${company.technicalDirector.crm}`],
    ["Encarregado de dados (LGPD)", `${company.dpo.name} · ${company.dpo.email}`],
    ["Ouvidoria", company.ombudsmanEmail],
  ];
  return (
    <Section>
      <PageTitle eyebrow="Transparência" title="Quem somos e como funcionam as regras.">
        A Prumo é uma clínica de telemedicina. Vendemos consulta médica. Não vendemos remédio e não somos farmácia.
      </PageTitle>

      <div className="mt-10 overflow-hidden rounded-card border border-border bg-surface">
        <table className="w-full text-left text-[15px]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <th scope="row" className="w-1/3 bg-bg px-5 py-4 align-top font-medium">{k}</th>
                <td className="px-5 py-4">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Como a receita funciona</h2>
          <p className="mt-2 text-muted">
            A receita é emitida no seu nome, com assinatura digital no padrão ICP-Brasil, e fica na sua conta para baixar. Ela vale em qualquer
            farmácia do país. A Prumo não envia receitas para farmácias.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Farmácia: livre escolha</h2>
          <p className="mt-2 text-muted">
            A {pharmacyPartner.name} é outra empresa, com CNPJ, farmacêutico e site próprios. Ela aparece como opção integrada. Nenhum valor da
            farmácia vem para a Prumo, para os médicos ou para quem divulga a Prumo.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Como os médicos são pagos</h2>
          <p className="mt-2 text-muted">
            Por consulta realizada, com valor fixo. O valor não muda se houver ou não receita, e os médicos não veem dados de venda de nenhuma
            farmácia.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Seus dados</h2>
          <p className="mt-2 text-muted">
            Ficam em servidores no Brasil. Suas respostas de saúde são vistas só pelo seu médico e pelo diretor técnico, com registro de cada acesso.
            O prontuário é guardado por 20 anos, como exige a Lei 13.787/2018.
          </p>
        </Card>
      </div>

      <p className="mt-10 text-sm text-muted">
        Telemedicina regulamentada pela Lei 14.510/2022 e pela Resolução CFM 2.314/2022. Publicidade conforme a Resolução CFM 2.336/2023.
      </p>
    </Section>
  );
}
