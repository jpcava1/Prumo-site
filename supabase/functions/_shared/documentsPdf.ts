/**
 * PDFs do paciente: "Seu Plano" e a receita (dois documentos separados).
 * Sem dependências e sem APIs do Deno ou do navegador: recebe o documento jsPDF pronto,
 * para rodar igual no site (download) e na função send-documents (e-mail).
 * REGRA: o Seu Plano não traz componentes nem doses; isso fica só na receita.
 */

export type PdfSection = "objetivo" | "meta" | "cafe" | "almoco" | "lanche" | "jantar" | "rotina" | "cuidado" | "exame";

export interface PdfPlanItem {
  section: PdfSection;
  title: string;
  detail?: string | null;
}

export interface PdfPerson {
  full_name: string | null;
}

export interface PdfProfessional {
  full_name: string;
  kind: "medico" | "nutricionista" | "educador_fisico";
  council: string;
  council_number: string;
  council_uf: string;
  rqe?: string | null;
  specialty?: string | null;
}

export interface PdfCompany {
  brand: string;
  legalName: string;
  cnpj: string;
  site?: string;
}

/** Só os métodos do jsPDF que usamos (o objeto jsPDF real satisfaz esta interface). */
export interface PdfDoc {
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  setFont(font: string, style?: string): unknown;
  setFontSize(size: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setFillColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setLineWidth(w: number): unknown;
  text(text: string | string[], x: number, y: number, options?: { align?: "left" | "center" | "right" }): unknown;
  rect(x: number, y: number, w: number, h: number, style?: string): unknown;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  splitTextToSize(text: string, maxWidth: number): string[];
  addPage(): unknown;
  getNumberOfPages(): number;
  setPage(n: number): unknown;
}

type RGB = [number, number, number];
const COSMOS: RGB = [0, 48, 73];
const CRIMSON: RGB = [193, 18, 31];
const GOCHUJANG: RGB = [120, 0, 0];
const MARBLE: RGB = [102, 155, 188];
const CREAM: RGB = [253, 240, 213];
const MUTED: RGB = [74, 99, 117];
const LINE: RGB = [226, 232, 237];

const LABEL: Record<PdfSection, string> = {
  objetivo: "Objetivos",
  meta: "Metas",
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche da tarde",
  jantar: "Jantar",
  rotina: "Rotina e hábitos",
  cuidado: "Cuidados",
  exame: "Exames pedidos",
};
const MEALS: PdfSection[] = ["cafe", "almoco", "lanche", "jantar"];

const M = 18; // margem em mm

function councilLine(p: PdfProfessional) {
  const rqe = p.rqe ? ` · RQE ${p.rqe}` : "";
  return `${p.council} ${p.council_number}/${p.council_uf}${rqe}`;
}

function dateBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

/** Cursor de página: quebra de página automática e rodapé em todas as páginas. */
function writer(doc: PdfDoc, footer: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const state = { y: M };
  const ensure = (h: number) => {
    if (state.y + h > H - 22) {
      doc.addPage();
      state.y = M + 4;
    }
  };
  const finish = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(M, H - 16, W - M, H - 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(footer, W - 2 * M - 16), M, H - 11);
      doc.text(`${i}/${n}`, W - M, H - 11, { align: "right" });
    }
  };
  return { W, H, state, ensure, finish };
}

function header(doc: PdfDoc, W: number, title: string, subtitle: string, brand: string) {
  doc.setFillColor(...COSMOS);
  doc.rect(0, 0, W, 46, "F");
  doc.setFillColor(...CRIMSON);
  doc.rect(0, 46, W, 1.6, "F");
  // marca: fio de prumo
  doc.setDrawColor(...CREAM);
  doc.setLineWidth(0.8);
  doc.line(M + 3, 12, M + 3, 21);
  doc.setFillColor(...CRIMSON);
  doc.rect(M + 1.4, 21, 3.2, 3.2, "F");
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...CREAM);
  doc.text(brand, M + 8, 20);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.text(title, M, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MARBLE);
  doc.text(subtitle, W - M, 20, { align: "right" });
}

function meta(doc: PdfDoc, W: number, y: number, rows: [string, string][]) {
  const colW = (W - 2 * M) / rows.length;
  rows.forEach(([k, v], i) => {
    const x = M + i * colW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...CRIMSON);
    doc.text(k.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COSMOS);
    doc.text(doc.splitTextToSize(v, colW - 4), x, y + 5);
  });
}

function sectionTitle(doc: PdfDoc, w: ReturnType<typeof writer>, label: string) {
  // Reserva espaço para o título e o primeiro item, para o título não ficar sozinho no fim da página.
  w.ensure(34);
  w.state.y += 4;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COSMOS);
  doc.text(label, M, w.state.y);
  doc.setDrawColor(...GOCHUJANG);
  doc.setLineWidth(0.6);
  doc.line(M, w.state.y + 2, M + 14, w.state.y + 2);
  w.state.y += 8;
}

/** Lista com caixinha de marcar (para o paciente acompanhar). */
function checklist(doc: PdfDoc, w: ReturnType<typeof writer>, items: PdfPlanItem[], numbered = false) {
  const maxW = w.W - 2 * M - 9;
  items.forEach((it, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const t = doc.splitTextToSize(it.title, maxW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const d = it.detail ? doc.splitTextToSize(it.detail, maxW) : [];
    const h = t.length * 4.8 + d.length * 4.2 + 3.5;
    w.ensure(h);
    const y = w.state.y;
    if (numbered) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...MARBLE);
      doc.text(String(i + 1).padStart(2, "0"), M, y);
    } else {
      doc.setDrawColor(...MARBLE);
      doc.setLineWidth(0.35);
      doc.roundedRect(M, y - 3.4, 3.8, 3.8, 0.6, 0.6, "S");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...COSMOS);
    doc.text(t, M + 8, y);
    if (d.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(d, M + 8, y + t.length * 4.8);
    }
    w.state.y += h;
  });
}

/** Cardápio em cartões de 2 colunas. */
function meals(doc: PdfDoc, w: ReturnType<typeof writer>, items: PdfPlanItem[]) {
  const gap = 6;
  const colW = (w.W - 2 * M - gap) / 2;
  const bySection = MEALS.map((s) => ({ s, list: items.filter((i) => i.section === s) })).filter((x) => x.list.length);
  for (let r = 0; r < bySection.length; r += 2) {
    const pair = bySection.slice(r, r + 2);
    // Mede com a mesma fonte e o mesmo texto que vão ser desenhados.
    const heights = pair.map(({ list }) => {
      let h = 13;
      list.forEach((it, n) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        h += doc.splitTextToSize(`${list.length > 1 ? `Opção ${n + 1}: ` : ""}${it.title}`, colW - 10).length * 4.4;
        if (it.detail) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          h += doc.splitTextToSize(it.detail, colW - 10).length * 3.8;
        }
        h += 3;
      });
      return h + 1;
    });
    const h = Math.max(...heights);
    w.ensure(h + 4);
    pair.forEach(({ s, list }, i) => {
      const x = M + i * (colW + gap);
      const y0 = w.state.y;
      doc.setFillColor(...CREAM);
      doc.roundedRect(x, y0, colW, h, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...CRIMSON);
      doc.text(LABEL[s].toUpperCase(), x + 5, y0 + 7);
      let y = y0 + 13;
      list.forEach((it, n) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...COSMOS);
        const t = doc.splitTextToSize(`${list.length > 1 ? `Opção ${n + 1}: ` : ""}${it.title}`, colW - 10);
        doc.text(t, x + 5, y);
        y += t.length * 4.4;
        if (it.detail) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...MUTED);
          const d = doc.splitTextToSize(it.detail, colW - 10);
          doc.text(d, x + 5, y);
          y += d.length * 3.8;
        }
        y += 3;
      });
    });
    w.state.y += h + gap;
  }
}

export interface CarePlanPdfInput {
  company: PdfCompany;
  patient: PdfPerson;
  professional: PdfProfessional | null;
  issuedAt: string;
  items: PdfPlanItem[];
  returnHint?: string | null;
}

/** "Seu Plano": objetivos, metas, cardápio, rotina, cuidados e exames pedidos. */
export function drawCarePlanPdf(doc: PdfDoc, input: CarePlanPdfInput): PdfDoc {
  const w = writer(
    doc,
    `${input.company.brand} · ${input.company.legalName} · CNPJ ${input.company.cnpj}. Este plano complementa a orientação do seu profissional e não substitui a receita. Em urgência, ligue 192.`,
  );
  header(doc, w.W, "Seu Plano", "Consulta online", input.company.brand);
  w.state.y = 60;
  const firstName = (input.patient.full_name ?? "").split(" ")[0];
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...COSMOS);
  doc.text(firstName ? `${firstName}, este é o seu caminho a partir de hoje.` : "Este é o seu caminho a partir de hoje.", M, w.state.y);
  w.state.y += 10;
  const prof = input.professional;
  meta(doc, w.W, w.state.y, [
    ["Paciente", input.patient.full_name ?? "—"],
    ["Profissional", prof ? `${prof.full_name}\n${councilLine(prof)}` : "—"],
    ["Data", dateBR(input.issuedAt)],
  ]);
  w.state.y += 18;

  const has = (s: PdfSection) => input.items.some((i) => i.section === s);
  const pick = (s: PdfSection) => input.items.filter((i) => i.section === s);

  // Objetivos em destaque
  if (has("objetivo")) {
    const goals = pick("objetivo").map((g) => g.title);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(goals.join("  ·  "), w.W - 2 * M - 16);
    const h = 14 + lines.length * 5.4;
    w.ensure(h);
    doc.setFillColor(...COSMOS);
    doc.roundedRect(M, w.state.y, w.W - 2 * M, h, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MARBLE);
    doc.text("SEUS OBJETIVOS", M + 8, w.state.y + 8);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...CREAM);
    doc.text(lines, M + 8, w.state.y + 14.5);
    w.state.y += h + 4;
  }
  if (has("meta")) {
    sectionTitle(doc, w, "Metas");
    checklist(doc, w, pick("meta"));
  }
  if (MEALS.some(has)) {
    sectionTitle(doc, w, "Sua alimentação");
    meals(doc, w, input.items);
  }
  if (has("rotina")) {
    sectionTitle(doc, w, "Rotina e hábitos");
    checklist(doc, w, pick("rotina"));
  }
  if (has("cuidado")) {
    sectionTitle(doc, w, "Cuidados");
    checklist(doc, w, pick("cuidado"));
  }
  if (has("exame")) {
    sectionTitle(doc, w, "Exames pedidos");
    checklist(doc, w, pick("exame"), true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    w.ensure(8);
    doc.text("Leve o pedido de exames emitido pelo seu profissional ao laboratório.", M, w.state.y + 1);
    w.state.y += 6;
  }
  if (input.returnHint) {
    w.ensure(16);
    w.state.y += 4;
    doc.setDrawColor(...CRIMSON);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, w.state.y, w.W - 2 * M, 12, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COSMOS);
    doc.text(input.returnHint, M + 6, w.state.y + 7.5);
    w.state.y += 16;
  }
  w.finish();
  return doc;
}

export interface PrescriptionPdfInput {
  company: PdfCompany;
  patient: PdfPerson & { cpf?: string | null; birth_date?: string | null };
  professional: PdfProfessional | null;
  issuedAt: string;
  form: string;
  quantity: string;
  directions: string;
  items: { name: string; dose: string }[];
}

/** Receita do suplemento/fórmula. A via com assinatura ICP-Brasil vem da plataforma de telemedicina. */
export function drawPrescriptionPdf(doc: PdfDoc, input: PrescriptionPdfInput): PdfDoc {
  const w = writer(
    doc,
    `${input.company.brand} · ${input.company.legalName} · CNPJ ${input.company.cnpj}. A receita é do paciente e vale em qualquer farmácia. A via com assinatura digital ICP-Brasil é emitida pela plataforma de atendimento.`,
  );
  header(doc, w.W, "Receita", "Fórmula manipulada", input.company.brand);
  w.state.y = 60;
  const prof = input.professional;
  const cpf = input.patient.cpf ? input.patient.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : "—";
  meta(doc, w.W, w.state.y, [
    ["Paciente", input.patient.full_name ?? "—"],
    ["CPF", cpf],
    ["Data", dateBR(input.issuedAt)],
  ]);
  w.state.y += 18;

  sectionTitle(doc, w, "Prescrição");
  // tabela
  const tableW = w.W - 2 * M;
  doc.setFillColor(...CREAM);
  doc.rect(M, w.state.y - 4.5, tableW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CRIMSON);
  doc.text("COMPONENTE", M + 4, w.state.y + 0.5);
  doc.text("DOSE POR UNIDADE", M + tableW - 4, w.state.y + 0.5, { align: "right" });
  w.state.y += 9;
  input.items.forEach((it, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const name = doc.splitTextToSize(`${i + 1}. ${it.name}`, tableW - 60);
    const h = name.length * 5 + 3;
    w.ensure(h);
    doc.setTextColor(...COSMOS);
    doc.text(name, M + 4, w.state.y);
    doc.setFont("helvetica", "bold");
    doc.text(it.dose, M + tableW - 4, w.state.y, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, w.state.y + h - 4, M + tableW, w.state.y + h - 4);
    w.state.y += h;
  });
  w.state.y += 4;
  meta(doc, w.W, w.state.y, [
    ["Forma", input.form],
    ["Quantidade", input.quantity],
  ]);
  w.state.y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...CRIMSON);
  w.ensure(14);
  doc.text("MODO DE USO", M, w.state.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...COSMOS);
  const dir = doc.splitTextToSize(input.directions, w.W - 2 * M);
  doc.text(dir, M, w.state.y + 5.5);
  w.state.y += 8 + dir.length * 5;

  // assinatura
  w.ensure(32);
  w.state.y += 14;
  const cx = w.W / 2;
  doc.setDrawColor(...COSMOS);
  doc.setLineWidth(0.3);
  doc.line(cx - 45, w.state.y, cx + 45, w.state.y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COSMOS);
  doc.text(prof?.full_name ?? "Profissional", cx, w.state.y + 5.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (prof) doc.text(councilLine(prof), cx, w.state.y + 10.5, { align: "center" });
  w.finish();
  return doc;
}
