// @vitest-environment node
import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { drawCarePlanPdf, drawPrescriptionPdf, type PdfDoc } from "../supabase/functions/_shared/documentsPdf";
import { PLAN_SUGGESTIONS } from "@/content/planSuggestions";

const company = { brand: "Prumo", legalName: "Prumo Serviços Médicos Ltda.", cnpj: "00.000.000/0001-00" };
const professional = { full_name: "Ana Prado", kind: "nutricionista" as const, council: "CRN", council_number: "1234", council_uf: "PR" };
const newDoc = () => new jsPDF({ unit: "mm", format: "a4" });

describe("PDFs do paciente", () => {
  it("Seu Plano: gera PDF com todas as seções e quebra em páginas", () => {
    const doc = newDoc();
    drawCarePlanPdf(doc as unknown as PdfDoc, {
      company,
      patient: { full_name: "Paula Paciente" },
      professional,
      issuedAt: "2026-10-22T13:00:00Z",
      items: PLAN_SUGGESTIONS,
    });
    const raw = doc.output();
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    for (const t of ["Seu Plano", "Iogurte natural com fruta e aveia", "Hemograma completo", "CRN 1234/PR"]) expect(raw).toContain(t);
  });

  it("receita: documento separado, com componentes, dose e profissional", () => {
    const doc = newDoc();
    drawPrescriptionPdf(doc as unknown as PdfDoc, {
      company,
      patient: { full_name: "Paula Paciente", cpf: "52998224725" },
      professional,
      issuedAt: "2026-10-22T13:00:00Z",
      form: "Cápsulas",
      quantity: "60 cápsulas",
      directions: "1 ao dia",
      items: [{ name: "Componente A", dose: "100 mg" }],
    });
    const raw = doc.output();
    for (const t of ["Receita", "Componente A", "100 mg", "529.982.247-25", "Ana Prado"]) expect(raw).toContain(t);
  });

  it("o Seu Plano não leva componentes da receita", () => {
    const doc = newDoc();
    drawCarePlanPdf(doc as unknown as PdfDoc, {
      company,
      patient: { full_name: "Paula" },
      professional,
      issuedAt: "2026-10-22T13:00:00Z",
      items: [{ section: "rotina", title: "Caminhada de 30 minutos" }],
    });
    expect(doc.output()).not.toContain("Componente A");
  });
});
