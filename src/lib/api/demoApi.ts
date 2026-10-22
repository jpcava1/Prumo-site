import type {
  Api,
  Appointment,
  AuthUser,
  CareLine,
  ClinicalDocument,
  CarePlan,
  ConsentType,
  DoctorActive,
  OutcomeKind,
  Payment,
  PlanTemplate,
  Prescription,
  Professional,
  ProfessionalSignup,
  Profile,
  Role,
  TriageVersion,
} from "./types";
import { prescriptionText, validatePlan, validatePrescription } from "@/lib/prescription";
import type { Answers } from "@/lib/triage/schema";
import type { TriageAlert } from "@/lib/triage/engine";
import { ageOn, isAdult } from "@/lib/triage/engine";
import { careLineContent, launchSlugs } from "@/content/careLines";
import { PLAN_SUGGESTIONS } from "@/content/planSuggestions";
import { triageV1 } from "@/content/triage/v1";
import { DEFAULT_PRICE_CENTS, DEFAULT_RETURN_PRICE_CENTS } from "@/content/seed";
import { generateSlots, type AvailabilityRule, type DateAvailability, addDays, canCancelFree } from "@/lib/schedule";
import { onlyDigits } from "@/lib/cpf";
import { uid } from "@/lib/utils";

/**
 * MODO DEMONSTRAÇÃO — roda sem Supabase, tudo em memória (some ao recarregar a página).
 * Serve para ver o site funcionando no Lovable/preview antes de ligar o banco.
 * Código de login: 123456. Nenhum dado é enviado para lugar nenhum.
 */
export const DEMO_CODE = "123456";

interface TriageRow {
  id: string;
  patient_id: string;
  care_line: string;
  version_id: string;
  answers: Answers;
  alerts: TriageAlert[];
  status: "rascunho" | "enviada";
}

export function createDemoApi(): Api {
  let user: AuthUser | null = null;
  const listeners = new Set<(u: AuthUser | null) => void>();
  const profiles = new Map<string, Profile>();
  const consents: { user_id: string; type: ConsentType }[] = [];

  const careLines: CareLine[] = launchSlugs.map((slug, i) => ({
    slug,
    name: careLineContent[slug].name,
    short: careLineContent[slug].short,
    status: "ativa",
    price_cents: DEFAULT_PRICE_CENTS,
    return_price_cents: DEFAULT_RETURN_PRICE_CENTS,
    sort: i + 1,
  }));

  const versions: TriageVersion[] = launchSlugs.map((slug) => ({
    id: `tv-${slug}-1`,
    care_line: slug,
    version: 1,
    definition: triageV1(slug),
    published_at: new Date().toISOString(),
  }));

  const professionals: Professional[] = [
    { id: "p1", user_id: "demo-doctor", kind: "medico", full_name: "Dra. Helena Prado (demonstração)", council: "CRM", council_number: "00001", council_uf: "PR", rqe: null, specialty: "Clínica médica", photo_url: null, bio: "Profissional fictícia para demonstração do site.", care_lines: ["energia-e-disposicao", "suplementacao"], active: true },
    { id: "p2", user_id: null, kind: "nutricionista", full_name: "Rafael Tavares (demonstração)", council: "CRN", council_number: "00002", council_uf: "PR", rqe: null, specialty: "Nutrição", photo_url: null, bio: "Profissional fictício para demonstração do site.", care_lines: ["dieta", "suplementacao"], active: true },
    { id: "p3", user_id: null, kind: "educador_fisico", full_name: "Lívia Moraes (demonstração)", council: "CREF", council_number: "000003-G", council_uf: "PR", rqe: null, specialty: "Personal trainer", photo_url: null, bio: "Profissional fictícia para demonstração do site.", care_lines: ["treino"], active: true },
  ];

  let availability: AvailabilityRule[] = professionals.flatMap((p, i) =>
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      professional_id: p.id,
      weekday,
      start_time: i === 0 ? "08:00" : i === 1 ? "12:00" : "17:00",
      end_time: i === 0 ? "12:00" : i === 1 ? "18:00" : "21:00",
    })),
  );

  let dateAvailability: DateAvailability[] = [];
  const passwords = new Map<string, string>();
  const triage: TriageRow[] = [];
  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  const documents: ClinicalDocument[] = [];
  const outcomes = new Map<string, { outcome: OutcomeKind; return_days: number | null }>();
  const choices: { document_id: string; choice: "farmashop" | "baixou_pdf" }[] = [];
  const prescriptions: Prescription[] = [];
  const carePlans: CarePlan[] = [];
  const templates: PlanTemplate[] = [];
  const sentEmails: { to: string; appointment_id: string; attachments: string[] }[] = [];
  // Tabela de ativos da médica de demonstração (nomes genéricos; o médico cadastra os reais).
  const actives: DoctorActive[] = [1, 2, 3, 4].map((n) => ({
    id: `at${n}`,
    professional_id: "p1",
    name: `Componente de exemplo ${n}`,
    default_dose: `${n * 50} mg`,
    notes: n === 1 ? "Exemplo de observação do médico" : null,
  }));
  /** Profissional ligado ao usuário logado (na demonstração, o médico assume a p1). */
  const myProfessional = () => {
    const u = need();
    const p = professionals.find((x) => x.user_id === u.id);
    if (!p && role() === "medical_director") return professionals[0];
    if (!p) throw new Error("Você não tem permissão para isso.");
    return p;
  };
  const myAppointment = (appointmentId: string) => {
    const a = appointments.find((x) => x.id === appointmentId);
    if (!a || a.professional_id !== myProfessional().id) throw new Error("Consulta não encontrada.");
    return a;
  };

  const delay = <T,>(v: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(v), ms));
  const need = () => {
    if (!user) throw new Error("Entre na sua conta para continuar.");
    return user;
  };
  const withProf = (a: Appointment): Appointment => ({ ...a, professional: professionals.find((p) => p.id === a.professional_id) });
  const role = () => (user ? profiles.get(user.id)?.role ?? "patient" : "patient");
  const requireRole = (...roles: Role[]) => {
    if (!roles.includes(role())) throw new Error("Você não tem permissão para isso.");
  };
  const expireHolds = () => {
    const now = Date.now();
    for (const a of appointments) if (a.status === "reservado" && a.hold_expires_at && new Date(a.hold_expires_at).getTime() < now) a.status = "expirado";
  };
  const busy = () =>
    appointments
      .filter((a) => ["reservado", "pago", "confirmado", "realizado", "nao_compareceu"].includes(a.status))
      .map((a) => ({ professional_id: a.professional_id, starts_at: a.starts_at, ends_at: a.ends_at }));

  const signInAs = (email: string): AuthUser => {
    const normalized = email.trim().toLowerCase();
    let h = 0;
    for (const ch of normalized) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    user = { id: "demo-" + h.toString(36), email: normalized };
    if (!profiles.has(user.id)) {
      profiles.set(user.id, { id: user.id, role: "patient", full_name: null, cpf: null, birth_date: null, phone: null, email: normalized });
    }
    listeners.forEach((l) => l(user));
    return user;
  };
  /** Profissionais que aparecem para o paciente: ativos, aprovados e que atendem a linha. */
  const bookable = (careLine: string) =>
    professionals.filter(
      (p) => p.active && (p.approval ?? "aprovado") === "aprovado" && (!p.care_lines?.length || p.care_lines.includes(careLine)),
    );

  const api: Api = {
    mode: "demo",

    async getUser() {
      return delay(user, 20);
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async sendCode() {
      return delay(undefined);
    },
    async verifyCode(email, code) {
      if (code.trim() !== DEMO_CODE) throw new Error(`Código inválido. No modo demonstração use ${DEMO_CODE}.`);
      return delay(signInAs(email));
    },
    async signInWithPassword(email, password) {
      const normalized = email.trim().toLowerCase();
      const saved = passwords.get(normalized);
      if (!saved || saved !== password) throw new Error("E-mail ou senha incorretos.");
      return delay(signInAs(normalized));
    },
    async signUpWithPassword(email, password) {
      const normalized = email.trim().toLowerCase();
      if (passwords.has(normalized)) throw new Error("Já existe uma conta com este e-mail. Entre com a sua senha.");
      if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
      passwords.set(normalized, password);
      return delay(signInAs(normalized));
    },
    async requestPasswordReset() {
      return delay(undefined);
    },
    async signOut() {
      user = null;
      listeners.forEach((l) => l(null));
    },

    async getProfile() {
      return delay(user ? profiles.get(user.id) ?? null : null, 20);
    },
    async saveProfile(input) {
      const u = need();
      const p: Profile = { ...profiles.get(u.id)!, full_name: input.full_name.trim(), cpf: onlyDigits(input.cpf), birth_date: input.birth_date, phone: onlyDigits(input.phone) };
      profiles.set(u.id, p);
      return delay(p);
    },
    async recordConsents(types) {
      const u = need();
      types.forEach((t) => consents.push({ user_id: u.id, type: t }));
      return delay(undefined);
    },
    async listCareLines() {
      return delay([...careLines].sort((a, b) => a.sort - b.sort), 20);
    },
    async getTriageVersion(careLine) {
      const v = versions.filter((x) => x.care_line === careLine).sort((a, b) => b.version - a.version)[0];
      if (!v) throw new Error("Triagem não encontrada.");
      return delay(v, 20);
    },
    async saveTriageDraft({ id, care_line, version_id, answers }) {
      const u = need();
      if (id) {
        const row = triage.find((t) => t.id === id && t.patient_id === u.id);
        if (row && row.status === "rascunho") row.answers = answers;
        return delay(id, 20);
      }
      const row: TriageRow = { id: uid(), patient_id: u.id, care_line, version_id, answers, alerts: [], status: "rascunho" };
      triage.push(row);
      return delay(row.id, 20);
    },
    async submitTriage(id, answers, alerts) {
      const u = need();
      const row = triage.find((t) => t.id === id && t.patient_id === u.id);
      if (!row) throw new Error("Triagem não encontrada.");
      Object.assign(row, { answers, alerts, status: "enviada" });
      return delay(undefined);
    },
    async uploadTriageFile(_responseId, file) {
      return delay(`demo/${file.name}`);
    },
    async listProfessionals() {
      return delay(professionals.filter((p) => p.active && (p.approval ?? "aprovado") === "aprovado"), 20);
    },
    async listSlots(careLine, fromISO, days) {
      expireHolds();
      const ids = new Set(bookable(careLine).map((p) => p.id));
      return delay(
        generateSlots({
          rules: availability.filter((r) => ids.has(r.professional_id)),
          dateRules: dateAvailability.filter((r) => ids.has(r.professional_id)),
          busy: busy(),
          from: new Date(fromISO),
          days,
        }),
        80,
      );
    },
    async reserveSlot(input) {
      const u = need();
      const p = profiles.get(u.id)!;
      if (!p.full_name || !p.cpf || !p.birth_date) throw new Error("Complete seu cadastro antes de agendar.");
      if (!isAdult(p.birth_date)) throw new Error("Atendemos apenas maiores de 18 anos.");
      if (!consents.some((c) => c.user_id === u.id && c.type === "dados_saude")) {
        throw new Error("Precisamos da sua autorização para usar seus dados de saúde no atendimento.");
      }
      if (input.kind === "primeira" && !triage.some((t) => t.id === input.triage_response_id && t.status === "enviada")) {
        throw new Error("Conclua a triagem antes de escolher o horário.");
      }
      expireHolds();
      appointments.forEach((a) => {
        if (a.patient_id === u.id && a.status === "reservado") a.status = "expirado";
      });
      const start = new Date(input.starts_at).getTime();
      const end = start + 30 * 60_000;
      const offered = await api.listSlots(input.care_line, new Date(start - 86400_000).toISOString(), 3);
      if (!offered.some((s) => s.professional_id === input.professional_id && new Date(s.starts_at).getTime() === start)) {
        throw new Error("Esse horário acabou de ser reservado. Escolha outro.");
      }
      const clash = busy().some((b) => b.professional_id === input.professional_id && start < new Date(b.ends_at).getTime() && end > new Date(b.starts_at).getTime());
      if (clash) throw new Error("Esse horário acabou de ser reservado. Escolha outro.");
      const line = careLines.find((c) => c.slug === input.care_line)!;
      const appt: Appointment = {
        id: uid(),
        patient_id: u.id,
        professional_id: input.professional_id,
        care_line: input.care_line,
        kind: input.kind,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        status: "reservado",
        hold_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        room_url: null,
        price_cents: input.kind === "primeira" ? line.price_cents : line.return_price_cents,
        triage_response_id: input.triage_response_id,
      };
      appointments.push(appt);
      return delay(withProf(appt));
    },
    async getAppointment(id) {
      const a = appointments.find((x) => x.id === id);
      return delay(a ? withProf(a) : null, 20);
    },
    async listMyAppointments() {
      const u = need();
      expireHolds();
      return delay(
        appointments.filter((a) => a.patient_id === u.id && a.status !== "expirado").map(withProf).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
        20,
      );
    },
    async cancelAppointment(id) {
      const u = need();
      const a = appointments.find((x) => x.id === id && x.patient_id === u.id);
      if (!a) throw new Error("Consulta não encontrada.");
      if (a.status === "reservado") {
        a.status = "cancelado";
        return delay({ charged: false });
      }
      if (!["pago", "confirmado"].includes(a.status)) throw new Error("Esta consulta não pode mais ser cancelada.");
      if (!canCancelFree(a.starts_at)) return delay({ charged: true });
      a.status = "cancelado";
      return delay({ charged: false });
    },
    async startPayment(appointmentId) {
      const a = appointments.find((x) => x.id === appointmentId);
      if (!a) throw new Error("Consulta não encontrada.");
      const p: Payment = {
        id: uid(),
        appointment_id: a.id,
        status: "pendente",
        method: null,
        amount_cents: a.price_cents,
        invoice_url: null,
        pix_qr_base64: null,
        pix_copy_paste: "00020126DEMONSTRACAO-SEM-VALOR-REAL5204000053039865802BR",
        nfse_url: null,
        created_at: new Date().toISOString(),
      };
      payments.push(p);
      return delay(p, 400);
    },
    async getPayment(appointmentId) {
      return delay(payments.filter((p) => p.appointment_id === appointmentId).at(-1) ?? null, 20);
    },
    async listMyPayments() {
      const u = need();
      const mine = new Set(appointments.filter((a) => a.patient_id === u.id).map((a) => a.id));
      return delay(payments.filter((p) => mine.has(p.appointment_id)), 20);
    },
    async listMyDocuments() {
      const u = need();
      return delay(documents.filter((d) => d.patient_id === u.id).sort((a, b) => b.issued_at.localeCompare(a.issued_at)), 20);
    },
    async getDocument(id) {
      return delay(documents.find((d) => d.id === id) ?? null, 20);
    },
    async getDocumentUrl(doc) {
      // Receita e Seu Plano viram PDF no próprio navegador (buildDocumentPdf).
      if (doc.kind === "receita" || doc.kind === "plano") return delay(null, 10);
      const rx = prescriptions.find((p) => p.document_id === doc.id);
      const body = rx ? `\n\n${prescriptionText(rx)}` : "";
      const text = `${doc.title}\n\nDOCUMENTO DE DEMONSTRAÇÃO — sem validade.\nEmitido em ${new Date(doc.issued_at).toLocaleString("pt-BR")}.${body}`;
      return delay("data:text/plain;charset=utf-8," + encodeURIComponent(text), 20);
    },
    async getPrescriptionForDocument(documentId) {
      const u = need();
      return delay(prescriptions.find((p) => p.document_id === documentId && p.patient_id === u.id) ?? null, 20);
    },
    async getDocumentContext(documentId) {
      const u = need();
      const document = documents.find((d) => d.id === documentId && (d.patient_id === u.id || role() === "medical_director"));
      if (!document) return delay(null, 10);
      const appt = appointments.find((a) => a.id === document.appointment_id);
      const prof = professionals.find((p) => p.id === appt?.professional_id) ?? null;
      const pat = profiles.get(document.patient_id);
      return delay({
        document,
        patient: { full_name: pat?.full_name ?? null, cpf: pat?.cpf ?? null, birth_date: pat?.birth_date ?? null },
        professional: prof,
        prescription: prescriptions.find((p) => p.document_id === documentId) ?? null,
        plan: carePlans.find((p) => p.document_id === documentId) ?? null,
      }, 20);
    },
    async recordPharmacyChoice(documentId, choice) {
      choices.push({ document_id: documentId, choice });
      return delay(undefined, 10);
    },
    async exportMyData() {
      const u = need();
      return delay({
        aviso: "Exportação de demonstração",
        perfil: profiles.get(u.id),
        consentimentos: consents.filter((c) => c.user_id === u.id),
        triagens: triage.filter((t) => t.patient_id === u.id).map(({ alerts: _a, ...rest }) => rest),
        consultas: appointments.filter((a) => a.patient_id === u.id),
        documentos: documents.filter((d) => d.patient_id === u.id),
      });
    },
    async requestDeletion() {
      need();
      return delay(undefined);
    },

    // Equipe ----------------------------------------------------------------
    async adminListAppointments(fromISO, toISO) {
      requireRole("staff", "admin", "medical_director");
      return delay(
        appointments
          .filter((a) => a.starts_at >= fromISO && a.starts_at < toISO && a.status !== "expirado")
          .map((a) => {
            const p = profiles.get(a.patient_id);
            return { ...withProf(a), patient: { full_name: p?.full_name ?? null, phone: p?.phone ?? null, email: p?.email ?? null } };
          })
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      );
    },
    async adminSetAppointmentStatus(id, status) {
      requireRole("staff", "admin");
      const a = appointments.find((x) => x.id === id);
      if (a) a.status = status;
      return delay(undefined);
    },
    async adminUpdateCareLine(slug, patch) {
      requireRole("admin");
      const c = careLines.find((x) => x.slug === slug);
      if (c) Object.assign(c, patch);
      return delay(undefined);
    },
    async adminListProfessionals() {
      requireRole("staff", "admin", "medical_director");
      return delay([...professionals]);
    },
    async adminUpsertProfessional(p) {
      requireRole("admin");
      if (p.id) {
        const cur = professionals.find((x) => x.id === p.id);
        if (cur) Object.assign(cur, p);
        return delay(cur!);
      }
      const created = { ...p, id: uid() } as Professional;
      professionals.push(created);
      return delay(created);
    },
    async adminListAvailability(professionalId) {
      requireRole("staff", "admin", "medical_director", "doctor");
      return delay(availability.filter((r) => r.professional_id === professionalId));
    },
    async adminSaveAvailability(professionalId, rules) {
      requireRole("staff", "admin");
      availability = [...availability.filter((r) => r.professional_id !== professionalId), ...rules.map((r) => ({ ...r, professional_id: professionalId }))];
      return delay(undefined);
    },
    async adminSetRole() {
      requireRole("admin");
      return delay(undefined);
    },
    async getMyProfessional() {
      const u = need();
      return delay(professionals.find((p) => p.user_id === u.id) ?? null, 20);
    },
    async registerProfessional(input: ProfessionalSignup) {
      const u = need();
      if (professionals.some((p) => p.user_id === u.id)) throw new Error("Você já tem cadastro de profissional.");
      if (!input.full_name.trim() || !input.council_number.trim() || !/^[A-Z]{2}$/.test(input.council_uf) || !input.graduation_institution.trim() || !input.graduation_year) {
        throw new Error("Preencha nome, registro no conselho, UF e formação.");
      }
      if (input.specialty?.trim() && !input.rqe?.trim()) throw new Error("Especialidade só pode ser informada com RQE.");
      const prof: Professional = {
        id: uid(),
        user_id: u.id,
        kind: input.kind,
        full_name: input.full_name.trim(),
        council: input.kind === "nutricionista" ? "CRN" : input.kind === "educador_fisico" ? "CREF" : "CRM",
        council_number: input.council_number.trim(),
        council_uf: input.council_uf,
        rqe: input.rqe?.trim() || null,
        specialty: input.specialty?.trim() || null,
        photo_url: null,
        bio: input.bio?.trim() || null,
        active: false,
        approval: "pendente",
        graduation_institution: input.graduation_institution.trim(),
        graduation_year: input.graduation_year,
        care_lines: input.kind === "nutricionista" ? ["dieta", "suplementacao"] : input.kind === "educador_fisico" ? ["treino"] : ["energia-e-disposicao", "suplementacao"],
      };
      professionals.push(prof);
      const pr = profiles.get(u.id);
      if (pr) profiles.set(u.id, { ...pr, full_name: pr.full_name ?? prof.full_name, phone: input.phone ? onlyDigits(input.phone) : pr.phone });
      return delay(prof);
    },
    async myListDateAvailability(fromDay, days) {
      const me = myProfessional();
      const to = addDays(fromDay, days);
      return delay(
        dateAvailability.filter((r) => r.professional_id === me.id && r.day >= fromDay && r.day < to).sort((a, b) => (a.day + a.start_time).localeCompare(b.day + b.start_time)),
        30,
      );
    },
    async mySaveDayAvailability(day, blocks) {
      const me = myProfessional();
      for (const b of blocks) if (!(b.end_time > b.start_time)) throw new Error("O fim precisa ser depois do início.");
      dateAvailability = [
        ...dateAvailability.filter((r) => !(r.professional_id === me.id && r.day === day)),
        ...blocks.map((b) => ({ professional_id: me.id, day, start_time: b.start_time, end_time: b.end_time })),
      ];
      return delay(undefined, 30);
    },
    async adminReviewProfessional(id, approve) {
      requireRole("admin", "staff");
      const p = professionals.find((x) => x.id === id);
      if (p) Object.assign(p, { approval: approve ? "aprovado" : "recusado", active: approve });
      return delay(undefined);
    },
    async demoApproveMyProfessional() {
      const u = need();
      const p = professionals.find((x) => x.user_id === u.id);
      if (p) Object.assign(p, { approval: "aprovado", active: true });
      return delay(undefined, 20);
    },
    async doctorAgenda() {
      const me = myProfessional();
      return delay(
        appointments
          .filter((a) => a.professional_id === me.id && ["pago", "confirmado", "realizado", "nao_compareceu"].includes(a.status))
          .map(withProf)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      );
    },
    async doctorGetTriage(appointmentId) {
      const me = myProfessional();
      const a = appointments.find((x) => x.id === appointmentId && (x.professional_id === me.id || role() === "medical_director"));
      if (!a) throw new Error("Você não tem permissão para isso.");
      const t = triage.find((x) => x.id === a?.triage_response_id);
      const def = versions.find((v) => v.id === t?.version_id)?.definition ?? triageV1("energia-e-disposicao");
      const p = a ? profiles.get(a.patient_id) : undefined;
      return delay({
        definition: def,
        answers: t?.answers ?? {},
        alerts: t?.alerts ?? [],
        patient: { full_name: p?.full_name ?? null, age: p?.birth_date ? ageOn(p.birth_date) : null, sex: (t?.answers?.sexo as string) ?? null },
      });
    },
    async doctorSetOutcome(appointmentId, outcome, returnDays) {
      myAppointment(appointmentId);
      outcomes.set(appointmentId, { outcome, return_days: returnDays });
      return delay(undefined);
    },
    async doctorListActives() {
      const me = myProfessional();
      return delay(actives.filter((a) => a.professional_id === me.id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), 30);
    },
    async doctorSaveActive(input) {
      const me = myProfessional();
      const name = input.name.trim();
      if (!name) throw new Error("Informe o nome do ativo.");
      const existing = input.id ? actives.find((a) => a.id === input.id && a.professional_id === me.id) : undefined;
      if (existing) {
        Object.assign(existing, { name, default_dose: input.default_dose?.trim() || null, notes: input.notes?.trim() || null });
        return delay(existing, 30);
      }
      const row: DoctorActive = { id: uid(), professional_id: me.id, name, default_dose: input.default_dose?.trim() || null, notes: input.notes?.trim() || null };
      actives.push(row);
      return delay(row, 30);
    },
    async doctorDeleteActive(id) {
      const me = myProfessional();
      const i = actives.findIndex((a) => a.id === id && a.professional_id === me.id);
      if (i >= 0) actives.splice(i, 1);
      return delay(undefined, 30);
    },
    async doctorGetPrescriptionDraft(appointmentId) {
      const a = myAppointment(appointmentId);
      return delay(prescriptions.find((p) => p.appointment_id === a.id) ?? null, 30);
    },
    async doctorSavePrescriptionDraft(appointmentId, input) {
      const a = myAppointment(appointmentId);
      let rx = prescriptions.find((p) => p.appointment_id === a.id);
      if (rx?.document_id) throw new Error("Esta receita já foi emitida.");
      const data = { form: input.form, quantity: input.quantity, directions: input.directions, items: input.items.map((i) => ({ ...i })) };
      if (rx) Object.assign(rx, data);
      else {
        rx = { id: uid(), appointment_id: a.id, patient_id: a.patient_id, professional_id: a.professional_id, document_id: null, issued_at: null, ...data };
        prescriptions.push(rx);
      }
      return delay(rx, 30);
    },
    async doctorListTemplates() {
      const me = myProfessional();
      return delay(templates.filter((t) => t.professional_id === me.id), 20);
    },
    async doctorSaveTemplate(input) {
      const me = myProfessional();
      const title = input.title.trim();
      if (!title) throw new Error("Escreva o texto do item.");
      const existing = input.id ? templates.find((t) => t.id === input.id && t.professional_id === me.id) : undefined;
      if (existing) {
        Object.assign(existing, { section: input.section, title, detail: input.detail?.trim() || null });
        return delay(existing, 20);
      }
      const row: PlanTemplate = { id: uid(), professional_id: me.id, section: input.section, title, detail: input.detail?.trim() || null };
      templates.push(row);
      return delay(row, 20);
    },
    async doctorDeleteTemplate(id) {
      const me = myProfessional();
      const i = templates.findIndex((t) => t.id === id && t.professional_id === me.id);
      if (i >= 0) templates.splice(i, 1);
      return delay(undefined, 20);
    },
    async doctorGetPlanDraft(appointmentId) {
      const a = myAppointment(appointmentId);
      return delay(carePlans.find((p) => p.appointment_id === a.id) ?? null, 20);
    },
    async doctorSavePlanDraft(appointmentId, items) {
      const a = myAppointment(appointmentId);
      let plan = carePlans.find((p) => p.appointment_id === a.id);
      if (plan?.document_id) throw new Error("Este plano já foi enviado ao paciente.");
      const clean = items.map((i) => ({ ...i }));
      if (plan) plan.items = clean;
      else {
        plan = { id: uid(), appointment_id: a.id, patient_id: a.patient_id, professional_id: a.professional_id, document_id: null, issued_at: null, items: clean };
        carePlans.push(plan);
      }
      return delay(plan, 20);
    },
    async doctorSendDocuments(appointmentId) {
      const a = myAppointment(appointmentId);
      const to = profiles.get(a.patient_id)?.email ?? null;
      const docs = documents.filter((d) => d.appointment_id === a.id && (d.kind === "plano" || d.kind === "receita"));
      if (!to || docs.length === 0) return delay({ sent_to: null });
      sentEmails.push({ to, appointment_id: a.id, attachments: docs.map((d) => d.kind) });
      return delay({ sent_to: to });
    },
    async doctorFinishConsultation(appointmentId, { outcome, returnDays, prescription, plan }) {
      const a = myAppointment(appointmentId);
      if (!["confirmado", "realizado"].includes(a.status)) throw new Error("Só é possível encerrar uma consulta confirmada.");
      if (outcome === "receita_emitida" && !prescription) throw new Error("Monte a receita antes de emiti-la.");
      const existing = prescriptions.find((p) => p.appointment_id === a.id);
      if (existing?.document_id) throw new Error("Esta receita já foi emitida.");
      const valid = prescription ? validatePrescription(prescription) : null;
      const planItems = plan ? validatePlan(plan) : [];
      const existingPlan = carePlans.find((p) => p.appointment_id === a.id);
      if (existingPlan?.document_id) throw new Error("Este plano já foi enviado ao paciente.");
      a.status = "realizado";
      outcomes.set(a.id, { outcome, return_days: returnDays });
      const issued_at = new Date().toISOString();
      const base = { appointment_id: a.id, patient_id: a.patient_id, pdf_path: "demo", issued_at };
      documents.push({ ...base, id: uid(), kind: "orientacao", title: "Orientações da consulta" });
      let planDocId: string | null = null;
      if (planItems.length) {
        planDocId = uid();
        documents.push({ ...base, id: planDocId, kind: "plano", title: "Seu Plano" });
        const pdata = { items: planItems, document_id: planDocId, issued_at };
        if (existingPlan) Object.assign(existingPlan, pdata);
        else carePlans.push({ id: uid(), appointment_id: a.id, patient_id: a.patient_id, professional_id: a.professional_id, ...pdata });
      }
      if (!valid) return delay({ document_id: null, plan_document_id: planDocId });
      const docId = uid();
      documents.push({ ...base, id: docId, kind: "receita", title: "Receita de suplemento manipulado" });
      const data = { ...valid, document_id: docId, issued_at };
      if (existing) Object.assign(existing, data);
      else prescriptions.push({ id: uid(), appointment_id: a.id, patient_id: a.patient_id, professional_id: a.professional_id, ...data });
      return delay({ document_id: docId, plan_document_id: planDocId });
    },
    async directorListTriageVersions(careLine) {
      requireRole("medical_director");
      return delay(versions.filter((v) => v.care_line === careLine).sort((a, b) => b.version - a.version));
    },
    async directorPublishTriage(careLine, definition) {
      requireRole("medical_director");
      const next = Math.max(0, ...versions.filter((v) => v.care_line === careLine).map((v) => v.version)) + 1;
      const v: TriageVersion = { id: `tv-${careLine}-${next}`, care_line: careLine, version: next, definition, published_at: new Date().toISOString() };
      versions.push(v);
      return delay(v);
    },
    async reportSummary(fromISO, toISO) {
      requireRole("staff", "admin", "medical_director");
      const inRange = appointments.filter((a) => a.starts_at >= fromISO && a.starts_at < toISO);
      const counted = inRange.filter((a) => ["confirmado", "realizado", "nao_compareceu"].includes(a.status));
      const byDay = new Map<string, number>();
      const byLine = new Map<string, number>();
      counted.forEach((a) => {
        byDay.set(a.starts_at.slice(0, 10), (byDay.get(a.starts_at.slice(0, 10)) ?? 0) + 1);
        byLine.set(a.care_line, (byLine.get(a.care_line) ?? 0) + 1);
      });
      const done = inRange.filter((a) => a.status === "realizado");
      const noShow = inRange.filter((a) => a.status === "nao_compareceu").length;
      return delay({
        consultsByDay: [...byDay].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
        consultsByLine: [...byLine].map(([care_line, count]) => ({ care_line, count })),
        noShowRate: done.length + noShow ? noShow / (done.length + noShow) : 0,
        occupancy: null,
        funnel: [
          { step: "triagens_enviadas", count: triage.filter((t) => t.status === "enviada").length },
          { step: "horarios_reservados", count: inRange.length },
          { step: "consultas_pagas", count: payments.filter((p) => p.status === "pago").length },
          { step: "consultas_realizadas", count: done.length },
        ],
        payouts: professionals
          .map((p) => {
            const first = done.filter((a) => a.professional_id === p.id && a.kind === "primeira").length;
            const ret = done.filter((a) => a.professional_id === p.id && a.kind === "retorno").length;
            return { professional_id: p.id, full_name: p.full_name, consults: first + ret, unit_cents: 6000, total_cents: first * 6000 + ret * 4000 };
          })
          .filter((x) => x.consults > 0),
        pharmacyChoice: {
          farmashop: choices.filter((c) => c.choice === "farmashop").length,
          baixou_pdf: choices.filter((c) => c.choice === "baixou_pdf").length,
        },
      });
    },

    // Só demonstração --------------------------------------------------------
    async demoConfirmPayment(appointmentId) {
      const a = appointments.find((x) => x.id === appointmentId);
      const p = payments.filter((x) => x.appointment_id === appointmentId).at(-1);
      if (!a) return;
      a.status = "confirmado";
      a.hold_expires_at = null;
      a.room_url = "about:blank#sala-de-demonstracao";
      if (p) Object.assign(p, { status: "pago", method: "pix" });
      return delay(undefined);
    },
    async demoCompleteConsultation(appointmentId, withPrescription) {
      const a = appointments.find((x) => x.id === appointmentId);
      if (!a) return;
      a.status = "realizado";
      const base = { appointment_id: a.id, patient_id: a.patient_id, pdf_path: "demo", issued_at: new Date().toISOString() };
      // Personal trainer (CREF) entrega o plano de treino como orientação; receita só com CRM ou CRN.
      const trainer = professionals.find((p) => p.id === a.professional_id)?.council === "CREF";
      documents.push({ ...base, id: uid(), kind: "orientacao", title: trainer ? "Plano de treino personalizado" : "Orientações da consulta" });
      if (withPrescription && !trainer) {
        const docId = uid();
        documents.push({ ...base, id: docId, kind: "receita", title: "Receita de suplemento manipulado" });
        prescriptions.push({
          id: uid(),
          appointment_id: a.id,
          patient_id: a.patient_id,
          professional_id: a.professional_id,
          document_id: docId,
          issued_at: base.issued_at,
          form: "Cápsulas",
          quantity: "60 cápsulas",
          directions: "Tomar 1 cápsula ao dia, após o café da manhã.",
          items: [
            { name: "Componente de exemplo 1", dose: "50 mg" },
            { name: "Componente de exemplo 2", dose: "100 mg" },
            { name: "Componente de exemplo 3", dose: "150 mg" },
          ],
        });
        const planDoc = uid();
        documents.push({ ...base, id: planDoc, kind: "plano", title: "Seu Plano" });
        carePlans.push({
          id: uid(),
          appointment_id: a.id,
          patient_id: a.patient_id,
          professional_id: a.professional_id,
          document_id: planDoc,
          issued_at: base.issued_at,
          items: PLAN_SUGGESTIONS.filter((x) => ["objetivo", "meta", "rotina", "exame"].includes(x.section)).slice(0, 12),
        });
      }
      return delay(undefined);
    },
    async demoSetRole(r) {
      const u = need();
      const p = profiles.get(u.id);
      if (p) p.role = r;
      if (r === "doctor") {
        // Na demonstração, quem vira médico assume a agenda da profissional p1.
        professionals[0].user_id = u.id;
      }
      return delay(undefined, 10);
    },
  };
  return api;
}
