// Mensagens ao paciente. REGRA: nenhuma cita motivo da consulta, linha de cuidado,
// sintoma, remédio ou farmácia. Só data, hora, profissional e link.
import { env, formatDateTimeBR } from "./common.ts";

export type MessageKind = "confirmacao" | "lembrete_24h" | "lembrete_1h" | "documentos" | "retorno" | "plano_e_receita";

export function buildMessage(kind: MessageKind, ctx: { startsAt?: string; professional?: string; returnDate?: string }) {
  const site = Deno.env.get("SITE_URL") ?? "";
  const link = `${site}/minha-conta`;
  const when = ctx.startsAt ? formatDateTimeBR(ctx.startsAt) : null;
  switch (kind) {
    case "confirmacao":
      return {
        subject: "Consulta Prumo confirmada",
        text: `Consulta confirmada para ${when!.date} às ${when!.time}, com ${ctx.professional}. Entre pelo link 10 minutos antes: ${link}`,
      };
    case "lembrete_24h":
      return { subject: "Sua consulta Prumo é amanhã", text: `Sua consulta Prumo é amanhã às ${when!.time}. Link: ${link}` };
    case "lembrete_1h":
      return { subject: "Sua consulta Prumo é em 1 hora", text: `Sua consulta Prumo é em 1 hora, às ${when!.time}. Link: ${link}` };
    case "documentos":
      return { subject: "Seus documentos estão prontos", text: `Seus documentos da consulta já estão na sua conta Prumo: ${link}/documentos` };
    case "plano_e_receita":
      // O texto do e-mail não cita motivo, remédio nem farmácia. O conteúdo vai só nos PDFs anexos.
      return {
        subject: "Seu Plano Prumo chegou",
        text: `Olá! Seguem em anexo os documentos da sua consulta: o Seu Plano e, se houver, a sua receita. Eles também ficam na sua conta: ${link}/documentos`,
      };
    case "retorno":
      return { subject: "Hora de agendar o retorno", text: `Seu médico sugeriu um retorno por volta de ${ctx.returnDate}. Quer agendar? ${link}` };
  }
}

export interface EmailAttachment {
  filename: string;
  /** Conteúdo em base64. */
  content: string;
}

/** E-mail transacional (Resend). Sem chave configurada, só registra no log. */
export async function sendEmail(to: string, subject: string, text: string, attachments: EmailAttachment[] = []): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.log("[email:simulado]", subject, attachments.map((a) => a.filename).join(", "));
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM"), to, subject, text, ...(attachments.length ? { attachments } : {}) }),
  });
  return res.ok;
}

/**
 * WhatsApp pela API oficial, via parceiro (BSP). Cada BSP tem um formato:
 * adapte o corpo abaixo ao do parceiro escolhido (Zenvia, Twilio, Gupshup, Blip…).
 * Use templates aprovados pela Meta com o mesmo texto neutro de buildMessage.
 */
export async function sendWhatsApp(phoneDigits: string, text: string): Promise<boolean> {
  const url = Deno.env.get("WHATSAPP_API_URL");
  const token = Deno.env.get("WHATSAPP_API_TOKEN");
  if (!url || !token) {
    console.log("[whatsapp:simulado]", phoneDigits.slice(-4));
    return true;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: `55${phoneDigits}`, text }),
  });
  return res.ok;
}
