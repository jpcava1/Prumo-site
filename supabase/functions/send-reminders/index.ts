// Lembretes 24 h e 1 h antes. Agende a cada 15 minutos (veja supabase/cron.sql).
// Protegida por um segredo próprio (CRON_SECRET) no header x-cron-secret.
// Deploy com: supabase functions deploy send-reminders --no-verify-jwt
import { adminClient, env, json, safeEqual } from "../_shared/common.ts";
import { buildMessage, sendEmail, sendWhatsApp, type MessageKind } from "../_shared/messages.ts";

const WINDOWS: { kind: MessageKind; fromMin: number; toMin: number }[] = [
  { kind: "lembrete_24h", fromMin: 23 * 60 + 40, toMin: 24 * 60 + 20 },
  { kind: "lembrete_1h", fromMin: 45, toMin: 75 },
];

Deno.serve(async (req) => {
  if (!safeEqual(req.headers.get("x-cron-secret") ?? "", env("CRON_SECRET"))) return json({ error: "nao_autorizado" }, 401);
  const db = adminClient();
  const now = Date.now();
  let sent = 0;

  for (const w of WINDOWS) {
    const from = new Date(now + w.fromMin * 60_000).toISOString();
    const to = new Date(now + w.toMin * 60_000).toISOString();
    const { data: appts } = await db
      .from("appointments")
      .select("id, starts_at, patient:profiles!appointments_patient_id_fkey(email, phone)")
      .eq("status", "confirmado")
      .gte("starts_at", from)
      .lt("starts_at", to);

    for (const a of appts ?? []) {
      const { data: already } = await db.from("notifications_log").select("channel").eq("appointment_id", a.id).eq("kind", w.kind);
      const done = new Set((already ?? []).map((r) => r.channel));
      const p = a.patient as unknown as { email: string | null; phone: string | null };
      const msg = buildMessage(w.kind, { startsAt: a.starts_at });

      if (!done.has("email") && p?.email && (await sendEmail(p.email, msg.subject, msg.text))) {
        await db.from("notifications_log").insert({ appointment_id: a.id, kind: w.kind, channel: "email" });
        sent++;
      }
      if (!done.has("whatsapp") && p?.phone && (await sendWhatsApp(p.phone, msg.text))) {
        await db.from("notifications_log").insert({ appointment_id: a.id, kind: w.kind, channel: "whatsapp" });
        sent++;
      }
    }
  }

  // Limpeza diária leve: triagens de quem não agendou, com mais de 90 dias.
  if (new Date().getUTCHours() === 6 && new Date().getUTCMinutes() < 15) await db.rpc("purge_stale_triage");

  return json({ ok: true, sent });
});
