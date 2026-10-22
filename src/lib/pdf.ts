import { jsPDF } from "jspdf";
import { company } from "@/config/site";
import type { DocumentContext } from "@/lib/api/types";
import { drawCarePlanPdf, drawPrescriptionPdf, type PdfCompany, type PdfDoc } from "../../supabase/functions/_shared/documentsPdf";

const pdfCompany = (): PdfCompany => ({ brand: company.brand, legalName: company.legalName, cnpj: company.cnpj });
const newDoc = () => new jsPDF({ unit: "mm", format: "a4" }) as unknown as PdfDoc & jsPDF;

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Monta o PDF do documento (Seu Plano ou receita). Retorna null se faltar conteúdo. */
export function buildDocumentPdf(ctx: DocumentContext): { doc: jsPDF; filename: string } | null {
  const first = slug((ctx.patient.full_name ?? "paciente").split(" ")[0]);
  const date = ctx.document.issued_at.slice(0, 10);
  if (ctx.document.kind === "plano" && ctx.plan) {
    const doc = newDoc();
    drawCarePlanPdf(doc, {
      company: pdfCompany(),
      patient: ctx.patient,
      professional: ctx.professional,
      issuedAt: ctx.plan.issued_at ?? ctx.document.issued_at,
      items: ctx.plan.items,
    });
    return { doc, filename: `seu-plano-prumo-${first}-${date}.pdf` };
  }
  if (ctx.document.kind === "receita" && ctx.prescription) {
    const rx = ctx.prescription;
    const doc = newDoc();
    drawPrescriptionPdf(doc, {
      company: pdfCompany(),
      patient: ctx.patient,
      professional: ctx.professional,
      issuedAt: rx.issued_at ?? ctx.document.issued_at,
      form: rx.form,
      quantity: rx.quantity,
      directions: rx.directions,
      items: rx.items,
    });
    return { doc, filename: `receita-prumo-${first}-${date}.pdf` };
  }
  return null;
}

/** Baixa o PDF no aparelho do paciente. */
export function downloadDocumentPdf(ctx: DocumentContext): boolean {
  const built = buildDocumentPdf(ctx);
  if (!built) return false;
  built.doc.save(built.filename);
  return true;
}
