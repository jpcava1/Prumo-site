// Recebe eventos da plataforma de telemedicina certificada.
// Assinatura: header x-signature = HMAC-SHA256(hex) do corpo cru com TELEMED_WEBHOOK_SECRET.
// Formato esperado (ajuste ao da plataforma contratada):
//   { "type": "consultation.finished", "appointment_id": "<uuid Prumo>" }
//   { "type": "document.issued", "appointment_id": "<uuid>", "kind": "receita|orientacao|pedido_exame|encaminhamento",
//     "title": "Receita digital", "external_id": "abc", "pdf_url": "https://..." }
// Deploy com: supabase functions deploy telemed-webhook --no-verify-jwt
import { adminClient, env, hmacSha256Hex, json, safeEqual } from "../_shared/common.ts";
import { buildMessage, sendEmail, sendWhatsApp } from "../_shared/messages.ts";

const KINDS = new Set(["receita", "orientacao", "pedido_exame", "encaminhamento"]);

Deno.serve(async (req) => {
  const raw = await req.text();
  const expected = await hmacSha256Hex(env("TELEMED_WEBHOOK_SECRET"), raw);
  if (!safeEqual(req.headers.get("x-signature") ?? "", expected)) return json({ error: "assinatura_invalida" }, 401);

  const evt = JSON.parse(raw);
  const db = adminClient();
  const { data: appt } = await db.from("appointments").select("id, patient_id, professional_id, status").eq("id", evt.appointment_id).maybeSingle();
  if (!appt) return json({ ok: true, ignored: "consulta_desconhecida" });

  if (evt.type === "consultation.finished") {
    if (["confirmado", "pago"].includes(appt.status)) await db.from("appointments").update({ status: "realizado" }).eq("id", appt.id);
    return json({ ok: true });
  }

  if (evt.type === "document.issued") {
    if (!KINDS.has(evt.kind)) return json({ error: "tipo_invalido" }, 400);

    // Idempotência: mesmo documento externo não entra duas vezes.
    if (evt.external_id) {
      const { data: dup } = await db.from("clinical_documents").select("id").eq("external_id", evt.external_id).maybeSingle();
      if (dup) return json({ ok: true, idempotent: true });
    }

    let pdfPath: string | null = null;
    if (evt.pdf_url) {
      const pdf = await fetch(evt.pdf_url);
      if (pdf.ok) {
        pdfPath = `${appt.patient_id}/${appt.id}/${evt.kind}-${crypto.randomUUID()}.pdf`;
        const up = await db.storage.from("clinical-docs").upload(pdfPath, await pdf.arrayBuffer(), { contentType: "application/pdf" });
        if (up.error) {
          console.error("upload pdf", up.error.message);
          pdfPath = null;
        }
      }
    }

    await db.from("clinical_documents").insert({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      professional_id: appt.professional_id,
      kind: evt.kind,
      title: String(evt.title ?? "Documento da consulta").slice(0, 120),
      pdf_path: pdfPath,
      external_id: evt.external_id ?? null,
    });

    // Avisa uma vez que há documentos (sem dizer quais).
    const { data: already } = await db.from("notifications_log").select("id").eq("appointment_id", appt.id).eq("kind", "documentos").limit(1);
    if (!already?.length) {
      const { data: p } = await db.from("profiles").select("email, phone").eq("id", appt.patient_id).single();
      const msg = buildMessage("documentos", {});
      if (p?.email && (await sendEmail(p.email, msg.subject, msg.text))) {
        await db.from("notifications_log").insert({ appointment_id: appt.id, kind: "documentos", channel: "email" });
      }
      if (p?.phone && (await sendWhatsApp(p.phone, msg.text))) {
        await db.from("notifications_log").insert({ appointment_id: appt.id, kind: "documentos", channel: "whatsapp" });
      }
    }
    return json({ ok: true });
  }

  return json({ ok: true, ignored: evt.type });
});
