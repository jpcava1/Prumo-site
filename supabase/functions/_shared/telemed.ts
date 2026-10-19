// Adaptador da plataforma de telemedicina certificada (NGS2).
// A plataforma ainda será escolhida (briefing, seção 16). Implemente createRoom com a API dela.
// Enquanto não houver, a sala fica nula e a equipe preenche room_url pelo painel/SQL.

export interface RoomRequest {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
  professional: { full_name: string; council: string; council_number: string; council_uf: string };
  patient: { full_name: string; cpf: string; birth_date: string; email: string; phone: string };
}

export interface RoomResult {
  roomUrl: string;
  externalRef: string;
}

export async function createRoom(_req: RoomRequest): Promise<RoomResult | null> {
  const base = Deno.env.get("TELEMED_API_URL");
  const key = Deno.env.get("TELEMED_API_KEY");
  if (!base || !key) return null;
  // Exemplo genérico. Troque pelo endpoint e formato reais da plataforma contratada.
  const res = await fetch(`${base}/appointments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: _req.appointmentId,
      starts_at: _req.startsAt,
      ends_at: _req.endsAt,
      professional: _req.professional,
      patient: _req.patient,
    }),
  });
  if (!res.ok) {
    console.error("telemed createRoom falhou", res.status);
    return null;
  }
  const data = await res.json();
  return { roomUrl: data.patient_url ?? data.room_url, externalRef: String(data.id) };
}
