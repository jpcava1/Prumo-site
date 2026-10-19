// Webhook do Asaas. Configure no painel do Asaas a URL desta função e o token
// (header "asaas-access-token") igual ao segredo ASAAS_WEBHOOK_TOKEN.
// Deploy com: supabase functions deploy payment-webhook --no-verify-jwt
import { adminClient, env, json, safeEqual } from "../_shared/common.ts";
import { buildMessage, sendEmail, sendWhatsApp } from "../_shared/messages.ts";
import { createRoom } from "../_shared/telemed.ts";

const PAID = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REFUNDED = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);

Deno.serve(async (req) => {
  const token = req.headers.get("asaas-access-token") ?? "";
  if (!safeEqual(token, env("ASAAS_WEBHOOK_TOKEN"))) return json({ error: "nao_autorizado" }, 401);

  const body = await req.json();
  const event: string = body.event;
  const gatewayId: string | undefined = body.payment?.id;
  if (!gatewayId) return json({ ok: true });

  const db = adminClient();
  const { data: pay } = await db.from("payments").select("id, appointment_id, status").eq("gateway_id", gatewayId).maybeSingle();
  if (!pay) return json({ ok: true, ignored: "pagamento_desconhecido" });

  if (PAID.has(event)) {
    if (pay.status === "pago") return json({ ok: true, idempotent: true });
    const method = body.payment?.billingType === "PIX" ? "pix" : "cartao";
    await db.from("payments").update({ status: "pago", method, paid_at: new Date().toISOString() }).eq("id", pay.id);

    const { data: appt } = await db
      .from("appointments")
      .select("id, starts_at, ends_at, status, patient_id, professional:professionals(full_name, council, council_number, council_uf)")
      .eq("id", pay.appointment_id)
      .single();
    if (!appt) return json({ ok: true });

    // Pagou depois de a reserva expirar e o horário ser ocupado? Marca para estorno.
    if (appt.status !== "reservado" && appt.status !== "pago") {
      await db.from("appointments").update({ refund_requested: true }).eq("id", appt.id);
      return json({ ok: true, refund: true });
    }

    const { data: patient } = await db.from("profiles").select("full_name, cpf, birth_date, email, phone").eq("id", appt.patient_id).single();
    const prof = appt.professional as unknown as { full_name: string; council: string; council_number: string; council_uf: string };
    const room = await createRoom({ appointmentId: appt.id, startsAt: appt.starts_at, endsAt: appt.ends_at, professional: prof, patient: patient! });

    await db
      .from("appointments")
      .update({ status: "confirmado", hold_expires_at: null, room_url: room?.roomUrl ?? null, external_ref: room?.externalRef ?? null })
      .eq("id", appt.id);

    // TODO NFS-e: emitir nota de serviço (o próprio Asaas emite via /invoices, ou use Focus NFe/eNotas).
    // Código de serviço municipal de consulta médica e alíquota: validar com o contador.

    const msg = buildMessage("confirmacao", { startsAt: appt.starts_at, professional: prof.full_name });
    const sentEmail = patient?.email ? await sendEmail(patient.email, msg.subject, msg.text) : false;
    const sentWa = patient?.phone ? await sendWhatsApp(patient.phone, msg.text) : false;
    const logs = [
      sentEmail && { appointment_id: appt.id, kind: "confirmacao", channel: "email" },
      sentWa && { appointment_id: appt.id, kind: "confirmacao", channel: "whatsapp" },
    ].filter(Boolean);
    if (logs.length) await db.from("notifications_log").upsert(logs, { onConflict: "appointment_id,kind,channel", ignoreDuplicates: true });
    return json({ ok: true });
  }

  if (REFUNDED.has(event)) {
    await db.from("payments").update({ status: "estornado" }).eq("id", pay.id);
    await db.from("appointments").update({ status: "estornado" }).eq("id", pay.appointment_id);
    return json({ ok: true });
  }

  if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED") {
    await db.from("payments").update({ status: "expirado" }).eq("id", pay.id).eq("status", "pendente");
  }
  return json({ ok: true });
});
