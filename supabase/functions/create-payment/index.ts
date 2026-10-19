// Cria a cobrança da CONSULTA no gateway (Asaas), na conta da Prumo.
// Nunca cobra fórmula, nunca divide pagamento com farmácia.
import { adminClient, corsHeaders, env, json, userFromRequest } from "../_shared/common.ts";

const ASAAS = () => Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS()}${path}`, {
    ...init,
    headers: { access_token: env("ASAAS_API_KEY"), "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`asaas ${path} ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await userFromRequest(req);
    if (!user) return json({ error: "login_necessario" }, 401);
    const { appointment_id } = await req.json();
    const db = adminClient();

    const { data: appt } = await db
      .from("appointments")
      .select("id, patient_id, status, price_cents, hold_expires_at, starts_at")
      .eq("id", appointment_id)
      .single();
    if (!appt || appt.patient_id !== user.id) return json({ error: "consulta_nao_encontrada" }, 404);
    if (appt.status !== "reservado") return json({ error: "consulta_nao_esta_aguardando_pagamento" }, 409);
    if (appt.hold_expires_at && new Date(appt.hold_expires_at) < new Date()) return json({ error: "reserva_expirada" }, 409);

    // Reaproveita cobrança pendente, se já existir.
    const { data: existing } = await db.from("payments").select("*").eq("appointment_id", appt.id).eq("status", "pendente").maybeSingle();
    if (existing) return json(existing);

    const { data: profile } = await db.from("profiles").select("full_name, cpf, email, phone").eq("id", user.id).single();
    if (!profile?.cpf || !profile.full_name) return json({ error: "cadastro_incompleto" }, 400);

    // Cliente no Asaas (procura pelo CPF antes de criar)
    const found = await asaas(`/customers?cpfCnpj=${profile.cpf}`);
    const customer =
      found?.data?.[0] ??
      (await asaas("/customers", {
        method: "POST",
        body: JSON.stringify({ name: profile.full_name, cpfCnpj: profile.cpf, email: profile.email ?? user.email, mobilePhone: profile.phone, notificationDisabled: true }),
      }));

    const due = new Date().toISOString().slice(0, 10);
    // Descrição neutra: nada sobre motivo da consulta.
    const payment = await asaas("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "UNDEFINED", // paciente escolhe Pix ou cartão na página do Asaas
        value: appt.price_cents / 100,
        dueDate: due,
        description: "Consulta médica online — Prumo",
        externalReference: appt.id,
      }),
    });

    let pix: { encodedImage?: string; payload?: string } = {};
    try {
      pix = await asaas(`/payments/${payment.id}/pixQrCode`);
    } catch (e) {
      console.warn("pix indisponível", (e as Error).message);
    }

    const { data: row, error } = await db
      .from("payments")
      .insert({
        appointment_id: appt.id,
        patient_id: user.id,
        gateway: "asaas",
        gateway_id: payment.id,
        status: "pendente",
        amount_cents: appt.price_cents,
        invoice_url: payment.invoiceUrl ?? null,
        pix_qr_base64: pix.encodedImage ?? null,
        pix_copy_paste: pix.payload ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return json(row);
  } catch (e) {
    console.error(e);
    return json({ error: "falha_no_pagamento" }, 500);
  }
});
