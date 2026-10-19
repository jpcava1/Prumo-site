import type {
  Api,
  Appointment,
  AuthUser,
  CareLine,
  ClinicalDocument,
  ConsentType,
  OutcomeKind,
  Payment,
  Professional,
  Profile,
  Role,
  TriageVersion,
} from "./types";
import type { Answers } from "@/lib/triage/schema";
import type { TriageAlert } from "@/lib/triage/engine";
import { ageOn, isAdult } from "@/lib/triage/engine";
import { careLineContent, launchSlugs } from "@/content/careLines";
import { triageV1 } from "@/content/triage/v1";
import { DEFAULT_PRICE_CENTS, DEFAULT_RETURN_PRICE_CENTS } from "@/content/seed";
import { generateSlots, type AvailabilityRule, canCancelFree } from "@/lib/schedule";
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
    { id: "p1", user_id: "demo-doctor", kind: "medico", full_name: "Dra. Helena Prado (demonstração)", council: "CRM", council_number: "00001", council_uf: "PR", rqe: null, specialty: "Clínica médica", photo_url: null, bio: "Profissional fictícia para demonstração do site.", active: true },
    { id: "p2", user_id: null, kind: "medico", full_name: "Dr. Rafael Tavares (demonstração)", council: "CRM", council_number: "00002", council_uf: "PR", rqe: null, specialty: "Dermatologia", photo_url: null, bio: "Profissional fictício para demonstração do site.", active: true },
    { id: "p3", user_id: null, kind: "medico", full_name: "Dra. Lívia Moraes (demonstração)", council: "CRM", council_number: "00003", council_uf: "SP", rqe: null, specialty: "Medicina de família", photo_url: null, bio: "Profissional fictícia para demonstração do site.", active: true },
  ];

  let availability: AvailabilityRule[] = professionals.flatMap((p, i) =>
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      professional_id: p.id,
      weekday,
      start_time: i === 0 ? "08:00" : i === 1 ? "12:00" : "17:00",
      end_time: i === 0 ? "12:00" : i === 1 ? "18:00" : "21:00",
    })),
  );

  const triage: TriageRow[] = [];
  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  const documents: ClinicalDocument[] = [];
  const outcomes = new Map<string, { outcome: OutcomeKind; return_days: number | null }>();
  const choices: { document_id: string; choice: "farmashop" | "baixou_pdf" }[] = [];

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
      const normalized = email.trim().toLowerCase();
      let h = 0;
      for (const ch of normalized) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      user = { id: "demo-" + h.toString(36), email: normalized };
      if (!profiles.has(user.id)) {
        profiles.set(user.id, { id: user.id, role: "patient", full_name: null, cpf: null, birth_date: null, phone: null, email });
      }
      listeners.forEach((l) => l(user));
      return delay(user);
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
      return delay(professionals.filter((p) => p.active), 20);
    },
    async listSlots(_careLine, fromISO, days) {
      expireHolds();
      return delay(generateSlots({ rules: availability, busy: busy(), from: new Date(fromISO), days }), 80);
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
      const text = `${doc.title}\n\nDOCUMENTO DE DEMONSTRAÇÃO — sem validade e sem conteúdo clínico.\nEmitido em ${new Date(doc.issued_at).toLocaleString("pt-BR")}.`;
      return delay("data:text/plain;charset=utf-8," + encodeURIComponent(text), 20);
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
    async doctorAgenda() {
      requireRole("doctor", "medical_director");
      return delay(
        appointments
          .filter((a) => a.professional_id === "p1" && ["confirmado", "realizado", "nao_compareceu"].includes(a.status))
          .map(withProf)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      );
    },
    async doctorGetTriage(appointmentId) {
      requireRole("doctor", "medical_director");
      const a = appointments.find((x) => x.id === appointmentId);
      const t = triage.find((x) => x.id === a?.triage_response_id);
      const def = versions.find((v) => v.id === t?.version_id)?.definition ?? triageV1("cabelo");
      const p = a ? profiles.get(a.patient_id) : undefined;
      return delay({
        definition: def,
        answers: t?.answers ?? {},
        alerts: t?.alerts ?? [],
        patient: { full_name: p?.full_name ?? null, age: p?.birth_date ? ageOn(p.birth_date) : null, sex: (t?.answers?.sexo as string) ?? null },
      });
    },
    async doctorSetOutcome(appointmentId, outcome, returnDays) {
      requireRole("doctor", "medical_director");
      outcomes.set(appointmentId, { outcome, return_days: returnDays });
      return delay(undefined);
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
      documents.push({ ...base, id: uid(), kind: "orientacao", title: "Orientações da consulta" });
      if (withPrescription) documents.push({ ...base, id: uid(), kind: "receita", title: "Receita digital" });
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
