// Utilitários compartilhados das Edge Functions (Deno).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function env(name: string, required = true): string {
  const v = Deno.env.get(name);
  if (!v && required) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v ?? "";
}

/** Cliente com service role: ignora RLS. Use só no servidor, nunca exponha. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

/** Identifica o usuário a partir do JWT enviado pelo front-end. */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

/** Comparação em tempo constante para tokens e assinaturas. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatDateTimeBR(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }),
    time: d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
  };
}
