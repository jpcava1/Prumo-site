// LGPD: o paciente baixa os próprios dados (art. 18). Só os dele, identificado pelo JWT.
import { adminClient, corsHeaders, json, userFromRequest } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const user = await userFromRequest(req);
  if (!user) return json({ error: "login_necessario" }, 401);
  const db = adminClient();
  const uid = user.id;

  const [profile, consents, triage, appointments, payments, documents, choices] = await Promise.all([
    db.from("profiles").select("full_name, cpf, birth_date, phone, email, created_at").eq("id", uid).single(),
    db.from("consents").select("type, version, accepted_at, revoked_at").eq("user_id", uid),
    db.from("triage_responses").select("care_line, answers, status, created_at, submitted_at").eq("patient_id", uid),
    db.from("appointments").select("care_line, kind, starts_at, status, price_cents").eq("patient_id", uid),
    db.from("payments").select("amount_cents, status, method, created_at, paid_at").eq("patient_id", uid),
    db.from("clinical_documents").select("kind, title, issued_at").eq("patient_id", uid),
    db.from("pharmacy_choice_events").select("choice, created_at").eq("user_id", uid),
  ]);

  await db.from("audit_log").insert({ actor_id: uid, action: "exportou_dados", table_name: "profiles", record_id: uid });

  return json({
    gerado_em: new Date().toISOString(),
    aviso: "Os PDFs dos documentos clínicos ficam disponíveis na sua conta, em Documentos.",
    perfil: profile.data,
    consentimentos: consents.data,
    triagens: triage.data,
    consultas: appointments.data,
    pagamentos: payments.data,
    documentos: documents.data,
    escolhas_de_farmacia: choices.data,
  });
});
