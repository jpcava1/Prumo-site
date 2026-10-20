import { useState } from "react";
import { Download, MessageCircle } from "lucide-react";
import { FARMASHOP_URL, pharmacyPartner } from "@/config/site";
import { api, type ClinicalDocument, type Prescription } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * TELA DA RECEITA — regra de livre escolha da farmácia (briefing, seções 3 e 6).
 *
 * As duas opções usam o MESMO componente (PharmacyOption) com as MESMAS props de estilo.
 * Não mude a aparência de uma sem mudar a da outra. O teste tests/pharmacy-choice.test.tsx
 * falha se as classes forem diferentes.
 *
 * "Pedir na Farmashop" apenas abre o WhatsApp da Farmashop em nova aba, com uma mensagem pronta
 * sem dado de saúde. A Prumo não envia a receita nem nenhum dado do paciente para a farmácia.
 */
const OPTION_CLASS =
  "flex min-h-[64px] w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-surface px-6 text-base font-semibold text-primary no-underline transition-colors hover:bg-primary-soft";

function PharmacyOption({
  as,
  href,
  onClick,
  icon,
  label,
  testId,
}: {
  as: "a" | "button";
  href?: string;
  onClick?: () => void;
  icon: "whatsapp" | "download";
  label: string;
  testId: string;
}) {
  const Icon = icon === "whatsapp" ? MessageCircle : Download;
  const content = (
    <>
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </>
  );
  if (as === "a") {
    return (
      <a data-testid={testId} className={OPTION_CLASS} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button data-testid={testId} type="button" className={OPTION_CLASS} onClick={onClick}>
      {content}
    </button>
  );
}

/** Componentes da receita emitida, só para o próprio paciente. Sem preço e sem farmácia. */
export function PrescriptionSummary({ prescription }: { prescription: Prescription }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-primary-soft/50 text-sm text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Componente</th>
              <th className="px-4 py-2 text-right font-medium">Dose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {prescription.items.map((i, n) => (
              <tr key={n}>
                <td className="px-4 py-3">{i.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.dose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-3 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Forma</dt>
          <dd>{prescription.form}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Quantidade</dt>
          <dd>{prescription.quantity}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-muted">Modo de uso</dt>
          <dd>{prescription.directions}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PharmacyChoice({ document }: { document: ClinicalDocument }) {
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    api.recordPharmacyChoice(document.id, "baixou_pdf").catch(() => undefined);
    try {
      const url = await api.getDocumentUrl(document);
      if (!url) throw new Error("O PDF ainda não está disponível.");
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title.replace(/\s+/g, "-").toLowerCase()}${api.mode === "demo" ? ".txt" : ".pdf"}`;
      a.rel = "noopener";
      a.click();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Onde você quer manipular?</h2>
        <p className="mt-2 text-muted">A receita é sua. Você pode manipular em qualquer farmácia do Brasil.</p>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2")}>
        <PharmacyOption
          as="a"
          testId="opcao-farmashop"
          href={FARMASHOP_URL}
          icon="whatsapp"
          label={`Pedir na ${pharmacyPartner.name}`}
          onClick={() => {
            api.recordPharmacyChoice(document.id, "farmashop").catch(() => undefined);
          }}
        />
        <PharmacyOption as="button" testId="opcao-baixar" icon="download" label="Salvar receita e levar a outra farmácia" onClick={download} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <p className="text-sm text-muted">
        A {pharmacyPartner.name} é uma farmácia de manipulação de Arapongas (PR), com farmacêutico responsável. Ao clicar, o WhatsApp dela abre
        com uma mensagem pronta; envie a sua receita por lá. A Prumo não envia seus dados para a farmácia e não recebe nada pela sua escolha.
      </p>
    </div>
  );
}

export const __test__ = { OPTION_CLASS };
