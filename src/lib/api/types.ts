import type { Answers, TriageDefinition } from "@/lib/triage/schema";
import type { TriageAlert } from "@/lib/triage/engine";
import type { Slot, AvailabilityRule, DateAvailability } from "@/lib/schedule";

export type Role = "patient" | "staff" | "doctor" | "medical_director" | "admin";
export type ConsentType = "termos" | "privacidade" | "dados_saude" | "tcle" | "cancelamento" | "marketing";

export interface AuthUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  cpf: string | null;
  birth_date: string | null; // YYYY-MM-DD
  phone: string | null;
  email: string | null;
}

export interface CareLine {
  slug: string;
  name: string;
  short: string;
  status: "ativa" | "fase2" | "fora";
  price_cents: number;
  return_price_cents: number;
  sort: number;
}

export interface Professional {
  id: string;
  user_id: string | null;
  kind: "medico" | "nutricionista";
  full_name: string;
  council: "CRM" | "CRN";
  council_number: string;
  council_uf: string;
  rqe: string | null;
  specialty: string | null;
  photo_url: string | null;
  bio: string | null;
  active: boolean;
  /** Cadastro feito pelo próprio profissional fica "pendente" até a Prumo conferir o conselho. */
  approval?: "pendente" | "aprovado" | "recusado";
  graduation_institution?: string | null;
  graduation_year?: number | null;
  /** Linhas que atende; vazio = todas. Nutricionista atende só suplementação. */
  care_lines?: string[];
}

/** Questionário de cadastro do profissional. */
export interface ProfessionalSignup {
  kind: "medico" | "nutricionista";
  full_name: string;
  council_number: string;
  council_uf: string;
  graduation_institution: string;
  graduation_year: number;
  specialty: string | null;
  rqe: string | null;
  bio: string | null;
  phone: string | null;
}

export type AppointmentStatus =
  | "reservado"
  | "pago"
  | "confirmado"
  | "realizado"
  | "nao_compareceu"
  | "cancelado"
  | "estornado"
  | "expirado";

export interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  care_line: string;
  kind: "primeira" | "retorno";
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  hold_expires_at: string | null;
  room_url: string | null;
  price_cents: number;
  triage_response_id: string | null;
  professional?: Professional;
  /** Só para a equipe (nome e contato para operar a agenda; nunca dado de saúde). */
  patient?: { full_name: string | null; phone: string | null; email: string | null };
}

export interface Payment {
  id: string;
  appointment_id: string;
  status: "pendente" | "pago" | "recusado" | "estornado" | "expirado";
  method: "pix" | "cartao" | null;
  amount_cents: number;
  invoice_url: string | null;
  pix_qr_base64: string | null;
  pix_copy_paste: string | null;
  nfse_url: string | null;
  created_at: string;
}

export type DocumentKind = "receita" | "orientacao" | "pedido_exame" | "encaminhamento";

export interface ClinicalDocument {
  id: string;
  appointment_id: string;
  patient_id: string;
  kind: DocumentKind;
  title: string;
  pdf_path: string | null;
  issued_at: string;
}

/** Componente de uma receita de suplemento manipulado (ativo + dose por unidade). */
export interface PrescriptionItem {
  name: string;
  dose: string;
}

/**
 * Receita montada pelo médico durante a consulta.
 * Só o médico autor (e o diretor técnico) vê o rascunho; o paciente vê depois de emitida.
 * Sem preço, sem farmácia: a receita é do paciente.
 */
export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  professional_id: string;
  document_id: string | null;
  form: string;
  quantity: string;
  directions: string;
  items: PrescriptionItem[];
  issued_at: string | null;
}

export type PrescriptionInput = Pick<Prescription, "form" | "quantity" | "directions" | "items">;

/** Tabela de ativos do médico: lista de consulta rápida, privada de cada profissional. */
export interface DoctorActive {
  id: string;
  professional_id: string;
  name: string;
  default_dose: string | null;
  notes: string | null;
}

export type OutcomeKind = "orientacao" | "receita_emitida" | "pedido_exame" | "encaminhamento" | "fora_escopo";

export interface TriageVersion {
  id: string;
  care_line: string;
  version: number;
  definition: TriageDefinition;
  published_at: string | null;
}

export interface TriageForDoctor {
  definition: TriageDefinition;
  answers: Answers;
  alerts: TriageAlert[];
  patient: { full_name: string | null; age: number | null; sex: string | null };
}

export interface ReportSummary {
  consultsByDay: { day: string; count: number }[];
  consultsByLine: { care_line: string; count: number }[];
  noShowRate: number;
  occupancy: number | null;
  funnel: { step: string; count: number }[];
  payouts: { professional_id: string; full_name: string; consults: number; unit_cents: number; total_cents: number }[];
  pharmacyChoice: { farmashop: number; baixou_pdf: number };
}

export interface ProfileInput {
  full_name: string;
  cpf: string;
  birth_date: string;
  phone: string;
}

export interface Api {
  mode: "demo" | "supabase";

  // Autenticação (código por e-mail, sem senha)
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<AuthUser>;
  /** Login com e-mail e senha. */
  signInWithPassword(email: string, password: string): Promise<AuthUser>;
  /** Cria a conta com e-mail e senha e já entra. */
  signUpWithPassword(email: string, password: string): Promise<AuthUser>;
  requestPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;

  // Paciente
  getProfile(): Promise<Profile | null>;
  saveProfile(input: ProfileInput): Promise<Profile>;
  recordConsents(types: ConsentType[]): Promise<void>;
  listCareLines(): Promise<CareLine[]>;
  getTriageVersion(careLine: string): Promise<TriageVersion>;
  saveTriageDraft(input: { id?: string; care_line: string; version_id: string; answers: Answers }): Promise<string>;
  submitTriage(id: string, answers: Answers, alerts: TriageAlert[]): Promise<void>;
  uploadTriageFile(responseId: string, file: File): Promise<string>;
  listProfessionals(): Promise<Professional[]>;
  listSlots(careLine: string, fromISO: string, days: number): Promise<Slot[]>;
  reserveSlot(input: { professional_id: string; starts_at: string; care_line: string; kind: "primeira" | "retorno"; triage_response_id: string | null }): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | null>;
  listMyAppointments(): Promise<Appointment[]>;
  cancelAppointment(id: string): Promise<{ charged: boolean }>;
  startPayment(appointmentId: string): Promise<Payment>;
  getPayment(appointmentId: string): Promise<Payment | null>;
  listMyPayments(): Promise<Payment[]>;
  listMyDocuments(): Promise<ClinicalDocument[]>;
  getDocument(id: string): Promise<ClinicalDocument | null>;
  getDocumentUrl(doc: ClinicalDocument): Promise<string | null>;
  /** Receita emitida ligada a um documento do próprio paciente (null se não houver). */
  getPrescriptionForDocument(documentId: string): Promise<Prescription | null>;
  recordPharmacyChoice(documentId: string, choice: "farmashop" | "baixou_pdf"): Promise<void>;
  exportMyData(): Promise<unknown>;
  requestDeletion(): Promise<void>;

  // Equipe
  adminListAppointments(fromISO: string, toISO: string): Promise<Appointment[]>;
  adminSetAppointmentStatus(id: string, status: Extract<AppointmentStatus, "nao_compareceu" | "estornado" | "realizado">): Promise<void>;
  adminUpdateCareLine(slug: string, patch: Partial<Pick<CareLine, "price_cents" | "return_price_cents" | "status" | "name" | "short">>): Promise<void>;
  adminListProfessionals(): Promise<Professional[]>;
  adminUpsertProfessional(p: Omit<Professional, "id"> & { id?: string }): Promise<Professional>;
  adminListAvailability(professionalId: string): Promise<AvailabilityRule[]>;
  adminSaveAvailability(professionalId: string, rules: Omit<AvailabilityRule, "professional_id">[]): Promise<void>;
  adminSetRole(email: string, role: Role): Promise<void>;
  // Profissional (médico ou nutricionista) cadastrado pelo site
  getMyProfessional(): Promise<Professional | null>;
  registerProfessional(input: ProfessionalSignup): Promise<Professional>;
  myListDateAvailability(fromDay: string, days: number): Promise<DateAvailability[]>;
  /** Substitui os horários de um dia (YYYY-MM-DD) pelos blocos informados. */
  mySaveDayAvailability(day: string, blocks: { start_time: string; end_time: string }[]): Promise<void>;
  adminReviewProfessional(id: string, approve: boolean): Promise<void>;
  doctorAgenda(): Promise<Appointment[]>;
  doctorGetTriage(appointmentId: string): Promise<TriageForDoctor>;
  doctorSetOutcome(appointmentId: string, outcome: OutcomeKind, returnDays: number | null): Promise<void>;
  doctorListActives(): Promise<DoctorActive[]>;
  doctorSaveActive(input: { id?: string; name: string; default_dose: string | null; notes: string | null }): Promise<DoctorActive>;
  doctorDeleteActive(id: string): Promise<void>;
  doctorGetPrescriptionDraft(appointmentId: string): Promise<Prescription | null>;
  doctorSavePrescriptionDraft(appointmentId: string, input: PrescriptionInput): Promise<Prescription>;
  /** Encerra a consulta: marca como realizada, grava o desfecho e, se houver receita, emite o documento para o paciente. */
  doctorFinishConsultation(
    appointmentId: string,
    input: { outcome: OutcomeKind; returnDays: number | null; prescription: PrescriptionInput | null },
  ): Promise<{ document_id: string | null }>;
  directorListTriageVersions(careLine: string): Promise<TriageVersion[]>;
  directorPublishTriage(careLine: string, definition: TriageDefinition): Promise<TriageVersion>;
  reportSummary(fromISO: string, toISO: string): Promise<ReportSummary>;

  // Só no modo demonstração
  demoCompleteConsultation?(appointmentId: string, withPrescription: boolean): Promise<void>;
  demoConfirmPayment?(appointmentId: string): Promise<void>;
  demoSetRole?(role: Role): Promise<void>;
  /** Demonstração: aprova o cadastro do profissional logado (na vida real, quem aprova é a Prumo). */
  demoApproveMyProfessional?(): Promise<void>;
}
