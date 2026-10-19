import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Api,
  Appointment,
  AuthUser,
  CareLine,
  ClinicalDocument,
  Payment,
  Professional,
  Profile,
  ReportSummary,
  TriageForDoctor,
  TriageVersion,
} from "./types";
import { legalVersions } from "@/config/site";
import { onlyDigits } from "@/lib/cpf";

/** Mensagens amigáveis para os erros levantados pelas funções do banco. */
const ERROR_MESSAGES: Record<string, string> = {
  login_necessario: "Entre na sua conta para continuar.",
  cadastro_incompleto: "Complete seu cadastro antes de agendar.",
  menor_de_idade: "Atendemos apenas maiores de 18 anos.",
  consentimento_dados_saude_ausente: "Precisamos da sua autorização para usar seus dados de saúde no atendimento.",
  linha_indisponivel: "Este atendimento não está disponível no momento.",
  triagem_necessaria: "Conclua a triagem antes de escolher o horário.",
  retorno_sem_consulta_anterior: "O retorno só pode ser agendado depois de uma consulta realizada.",
  horario_indisponivel: "Esse horário acabou de ser reservado. Escolha outro.",
  consulta_nao_encontrada: "Consulta não encontrada.",
  consulta_nao_cancelavel: "Esta consulta não pode mais ser cancelada.",
  sem_permissao: "Você não tem permissão para isso.",
};

function friendly(err: { message?: string } | null): Error {
  const raw = err?.message ?? "erro_desconhecido";
  const key = Object.keys(ERROR_MESSAGES).find((k) => raw.includes(k));
  return new Error(key ? ERROR_MESSAGES[key] : "Algo deu errado. Tente de novo em instantes.");
}

function must<T>(res: { data: T | null; error: { message?: string } | null }): T {
  if (res.error) throw friendly(res.error);
  return res.data as T;
}

const PROFESSIONAL_PUBLIC_COLUMNS =
  "id, user_id, kind, full_name, council, council_number, council_uf, rqe, specialty, photo_url, bio, active";

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  async function uidOrThrow(): Promise<string> {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error(ERROR_MESSAGES.login_necessario);
    return data.user.id;
  }

  const api: Api = {
    mode: "supabase",

    async getUser() {
      const { data } = await sb.auth.getUser();
      return data.user ? ({ id: data.user.id, email: data.user.email ?? "" } as AuthUser) : null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => {
        cb(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
      });
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
      if (error) throw new Error("Não foi possível enviar o código. Confira o e-mail e tente de novo.");
    },
    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
      if (error || !data.user) throw new Error("Código inválido ou vencido.");
      return { id: data.user.id, email: data.user.email ?? "" };
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async getProfile() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      const res = await sb.from("profiles").select("id, role, full_name, cpf, birth_date, phone, email").eq("id", data.user.id).maybeSingle();
      return must(res) as Profile | null;
    },
    async saveProfile(input) {
      const id = await uidOrThrow();
      const res = await sb
        .from("profiles")
        .update({ full_name: input.full_name.trim(), cpf: onlyDigits(input.cpf), birth_date: input.birth_date, phone: onlyDigits(input.phone) })
        .eq("id", id)
        .select("id, role, full_name, cpf, birth_date, phone, email")
        .single();
      if (res.error?.message?.includes("profiles_cpf_key")) throw new Error("Este CPF já está cadastrado em outra conta.");
      return must(res) as Profile;
    },
    async recordConsents(types) {
      const id = await uidOrThrow();
      const rows = types.map((t) => ({
        user_id: id,
        type: t,
        version: t === "marketing" ? "2026-10-v1" : legalVersions[t],
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 250) : null,
      }));
      must(await sb.from("consents").insert(rows));
    },
    async listCareLines() {
      return must(await sb.from("care_lines").select("*").order("sort")) as CareLine[];
    },
    async getTriageVersion(careLine) {
      const res = await sb
        .from("triage_versions")
        .select("id, care_line, version, definition, published_at")
        .eq("care_line", careLine)
        .not("published_at", "is", null)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      return must(res) as TriageVersion;
    },
    async saveTriageDraft({ id, care_line, version_id, answers }) {
      const patient_id = await uidOrThrow();
      if (id) {
        must(await sb.from("triage_responses").update({ answers }).eq("id", id));
        return id;
      }
      const res = await sb.from("triage_responses").insert({ patient_id, care_line, version_id, answers }).select("id").single();
      return (must(res) as { id: string }).id;
    },
    async submitTriage(id, answers, alerts) {
      must(
        await sb
          .from("triage_responses")
          .update({ answers, alerts, status: "enviada", submitted_at: new Date().toISOString() })
          .eq("id", id),
      );
    },
    async uploadTriageFile(responseId, file) {
      const uid = await uidOrThrow();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      const path = `${uid}/${responseId}/${Date.now()}-${safe}`;
      const { error } = await sb.storage.from("triage-files").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw new Error("Não foi possível enviar o arquivo. Use JPG, PNG ou PDF de até 10 MB.");
      return path;
    },
    async listProfessionals() {
      return must(await sb.from("professionals").select(PROFESSIONAL_PUBLIC_COLUMNS).eq("active", true).order("full_name")) as Professional[];
    },
    async listSlots(careLine, fromISO, days) {
      const res = await sb.rpc("available_slots", { p_care_line: careLine, p_from: fromISO.slice(0, 10), p_days: days });
      return (must(res) as { professional_id: string; starts_at: string }[]).map((r) => ({
        professional_id: r.professional_id,
        starts_at: new Date(r.starts_at).toISOString(),
      }));
    },
    async reserveSlot(input) {
      const res = await sb.rpc("reserve_slot", {
        p_professional_id: input.professional_id,
        p_starts_at: input.starts_at,
        p_care_line: input.care_line,
        p_kind: input.kind,
        p_triage_response_id: input.triage_response_id,
      });
      return must(res) as Appointment;
    },
    async getAppointment(id) {
      const res = await sb.from("appointments").select(`*, professional:professionals(${PROFESSIONAL_PUBLIC_COLUMNS})`).eq("id", id).maybeSingle();
      return must(res) as Appointment | null;
    },
    async listMyAppointments() {
      const uid = await uidOrThrow();
      const res = await sb
        .from("appointments")
        .select(`*, professional:professionals(${PROFESSIONAL_PUBLIC_COLUMNS})`)
        .eq("patient_id", uid)
        .not("status", "in", "(expirado)")
        .order("starts_at", { ascending: false });
      return must(res) as Appointment[];
    },
    async cancelAppointment(id) {
      return must(await sb.rpc("cancel_appointment", { p_id: id })) as { charged: boolean };
    },
    async startPayment(appointmentId) {
      const { data, error } = await sb.functions.invoke("create-payment", { body: { appointment_id: appointmentId } });
      if (error) throw new Error("Não foi possível iniciar o pagamento. Tente de novo.");
      return data as Payment;
    },
    async getPayment(appointmentId) {
      const res = await sb.from("payments").select("*").eq("appointment_id", appointmentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return must(res) as Payment | null;
    },
    async listMyPayments() {
      const uid = await uidOrThrow();
      return must(await sb.from("payments").select("*").eq("patient_id", uid).order("created_at", { ascending: false })) as Payment[];
    },
    async listMyDocuments() {
      const uid = await uidOrThrow();
      return must(await sb.from("clinical_documents").select("*").eq("patient_id", uid).order("issued_at", { ascending: false })) as ClinicalDocument[];
    },
    async getDocument(id) {
      return must(await sb.from("clinical_documents").select("*").eq("id", id).maybeSingle()) as ClinicalDocument | null;
    },
    async getDocumentUrl(doc) {
      if (!doc.pdf_path) return null;
      const { data, error } = await sb.storage.from("clinical-docs").createSignedUrl(doc.pdf_path, 600, { download: true });
      if (error) throw new Error("Não foi possível abrir o documento agora.");
      return data.signedUrl;
    },
    async recordPharmacyChoice(documentId, choice) {
      const uid = await uidOrThrow();
      // Registro best-effort: falhar aqui nunca impede o paciente de seguir.
      await sb.from("pharmacy_choice_events").insert({ user_id: uid, document_id: documentId, choice });
    },
    async exportMyData() {
      const { data, error } = await sb.functions.invoke("export-my-data", { body: {} });
      if (error) throw new Error("Não foi possível gerar o arquivo agora.");
      return data;
    },
    async requestDeletion() {
      const uid = await uidOrThrow();
      must(await sb.from("deletion_requests").insert({ user_id: uid }));
    },

    // Equipe ------------------------------------------------------------------
    async adminListAppointments(fromISO, toISO) {
      const res = await sb
        .from("appointments")
        .select(
          `id, patient_id, professional_id, care_line, kind, starts_at, ends_at, status, hold_expires_at, room_url, price_cents, triage_response_id, professional:professionals(${PROFESSIONAL_PUBLIC_COLUMNS}), patient:profiles!appointments_patient_id_fkey(full_name, phone, email)`,
        )
        .gte("starts_at", fromISO)
        .lt("starts_at", toISO)
        .not("status", "in", "(expirado)")
        .order("starts_at");
      return must(res) as unknown as Appointment[];
    },
    async adminSetAppointmentStatus(id, status) {
      must(await sb.from("appointments").update({ status }).eq("id", id));
    },
    async adminUpdateCareLine(slug, patch) {
      must(await sb.from("care_lines").update(patch).eq("slug", slug));
    },
    async adminListProfessionals() {
      return must(await sb.from("professionals").select(PROFESSIONAL_PUBLIC_COLUMNS).order("full_name")) as Professional[];
    },
    async adminUpsertProfessional(p) {
      const res = await sb.from("professionals").upsert(p).select(PROFESSIONAL_PUBLIC_COLUMNS).single();
      return must(res) as Professional;
    },
    async adminListAvailability(professionalId) {
      const res = await sb.from("availability").select("professional_id, weekday, start_time, end_time").eq("professional_id", professionalId).order("weekday");
      return (must(res) as { professional_id: string; weekday: number; start_time: string; end_time: string }[]).map((r) => ({
        ...r,
        start_time: r.start_time.slice(0, 5),
        end_time: r.end_time.slice(0, 5),
      }));
    },
    async adminSaveAvailability(professionalId, rules) {
      must(await sb.from("availability").delete().eq("professional_id", professionalId));
      if (rules.length) must(await sb.from("availability").insert(rules.map((r) => ({ ...r, professional_id: professionalId }))));
    },
    async adminSetRole(email, role) {
      must(await sb.rpc("admin_set_role", { p_email: email, p_role: role }));
    },
    async doctorAgenda() {
      const uid = await uidOrThrow();
      const prof = must(await sb.from("professionals").select("id").eq("user_id", uid).maybeSingle()) as { id: string } | null;
      if (!prof) return [];
      const from = new Date(Date.now() - 24 * 3600_000).toISOString();
      const res = await sb
        .from("appointments")
        .select("id, patient_id, professional_id, care_line, kind, starts_at, ends_at, status, room_url, price_cents, triage_response_id, hold_expires_at")
        .eq("professional_id", prof.id)
        .in("status", ["confirmado", "realizado", "nao_compareceu"])
        .gte("starts_at", from)
        .order("starts_at");
      return must(res) as Appointment[];
    },
    async doctorGetTriage(appointmentId) {
      return must(await sb.rpc("get_triage_for_appointment", { p_appointment_id: appointmentId })) as TriageForDoctor;
    },
    async doctorSetOutcome(appointmentId, outcome, returnDays) {
      const appt = must(await sb.from("appointments").select("professional_id").eq("id", appointmentId).single()) as { professional_id: string };
      must(
        await sb.from("outcomes").upsert({ appointment_id: appointmentId, professional_id: appt.professional_id, outcome, return_days: returnDays }),
      );
    },
    async directorListTriageVersions(careLine) {
      return must(
        await sb.from("triage_versions").select("id, care_line, version, definition, published_at").eq("care_line", careLine).order("version", { ascending: false }),
      ) as TriageVersion[];
    },
    async directorPublishTriage(careLine, definition) {
      return must(await sb.rpc("publish_triage_version", { p_care_line: careLine, p_definition: definition })) as TriageVersion;
    },
    async reportSummary(fromISO, toISO) {
      return must(await sb.rpc("report_summary", { p_from: fromISO, p_to: toISO })) as ReportSummary;
    },
  };
  return api;
}
