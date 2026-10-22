// Envia ao paciente, por e-mail, os PDFs da consulta: "Seu Plano" e a receita (dois anexos).
// Quem chama é o profissional da consulta, logo depois de encerrar. O texto do e-mail é neutro;
// os dados de saúde vão só nos anexos, para o e-mail do próprio paciente.
import { jsPDF } from "npm:jspdf@2.5.2";
import { adminClient, corsHeaders, json, userFromRequest } from "../_shared/common.ts";
import { buildMessage, sendEmail, type EmailAttachment } from "../_shared/messages.ts";
import { drawCarePlanPdf, drawPrescriptionPdf, type PdfDoc, type PdfProfessional } from "../_shared/documentsPdf.ts";

const company = () => ({
  brand: "Prumo",
  legalName: Deno.env.get("COMPANY_LEGAL_NAME") ?? "Prumo",
  cnpj: Deno.env.get("COMPANY_CNPJ") ?? "",
});

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

function toAttachment(doc: jsPDF, filename: string): EmailAttachment {
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { filename, content: btoa(bin) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const user = await userFromRequest(req);
  if (!user) return json({ error: "login_necessario" }, 401);
  const { appointment_id } = (await req.json().catch(() => ({}))) as { appointment_id?: string };
  if (!appointment_id) return json({ error: "consulta_nao_encontrada" }, 400);
  const db = adminClient();
  const { data: appt } = await db.from("appointments").select("id, patient_id, professional_id").eq("id", appointment_id).maybeSingle();
  if (!appt) return json({ error: "consulta_nao_encontrada" }, 404);
  const { data: prof } = await db
    .from("professionals")
    .select("user_id, full_name, kind, council, council_number, council_uf, rqe, specialty")
    .eq("id", appt.professional_id)
    .single();
  // Só o profissional da própria consulta pode disparar o envio.
  if (!prof || prof.user_id !== user.id) return json({ error: "sem_permissao" }, 403);

  const [{ data: patient }, { data: plan }, { data: rx }] = await Promise.all([
    db.from("profiles").select("full_name, cpf, birth_date, email").eq("id", appt.patient_id).single(),
    db.from("care_plans").select("items, issued_at, document_id").eq("appointment_id", appointment_id).maybeSingle(),
    db.from("prescriptions").select("form, quantity, directions, items, issued_at, document_id").eq("appointment_id", appointment_id).maybeSingle(),
  ]);
  if (!patient?.email) return json({ sent_to: null });

  const professional = prof as unknown as PdfProfessional;
  const first = slug((patient.full_name ?? "paciente").split(" ")[0]);
  const attachments: EmailAttachment[] = [];

  if (plan?.document_id) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    drawCarePlanPdf(doc as unknown as PdfDoc, { company: company(), patient, professional, issuedAt: plan.issued_at, items: plan.items });
    attachments.push(toAttachment(doc, `seu-plano-prumo-${first}.pdf`));
  }
  if (rx?.document_id) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    drawPrescriptionPdf(doc as unknown as PdfDoc, {
      company: company(),
      patient,
      professional,
      issuedAt: rx.issued_at,
      form: rx.form,
      quantity: rx.quantity,
      directions: rx.directions,
      items: rx.items,
    });
    attachments.push(toAttachment(doc, `receita-prumo-${first}.pdf`));
  }
  if (attachments.length === 0) return json({ sent_to: null });

  const msg = buildMessage("plano_e_receita", {});
  const ok = await sendEmail(patient.email, msg.subject, msg.text, attachments);
  if (!ok) return json({ error: "email_falhou" }, 502);
  await db.from("notifications_log").upsert({ appointment_id, kind: "documentos", channel: "email" }, { onConflict: "appointment_id,kind,channel" });
  return json({ sent_to: patient.email });
});
