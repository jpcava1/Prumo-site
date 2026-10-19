// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, createDb, createUser, type Db } from "./harness";

/**
 * Testes de banco: rodam as migrations reais num Postgres em memória e verificam
 * as regras do projeto (RLS, reserva de horário, repasse sem ligação com receita).
 */

const PATIENT_A = "11111111-1111-4111-8111-111111111111";
const PATIENT_B = "22222222-2222-4222-8222-222222222222";
const MINOR = "33333333-3333-4333-8333-333333333333";
const STAFF = "44444444-4444-4444-8444-444444444444";
const DOCTOR_1 = "55555555-5555-4555-8555-555555555555";
const DOCTOR_2 = "66666666-6666-4666-8666-666666666666";
const DIRECTOR = "77777777-7777-4777-8777-777777777777";
const ADMIN = "88888888-8888-4888-8888-888888888888";

let db: Db;
let prof1: string;
let prof2: string;

async function submittedTriage(userId: string, careLine = "cabelo"): Promise<string> {
  const [v] = await asUser<{ id: string }>(db, userId, "select id from public.triage_versions where care_line = $1 and version = 1", [careLine]);
  const [r] = await asUser<{ id: string }>(
    db,
    userId,
    "insert into public.triage_responses (patient_id, care_line, version_id, answers) values ($1, $2, $3, $4) returning id",
    [userId, careLine, v.id, JSON.stringify({ sexo: "M", relato: "teste" })],
  );
  // envio: o próprio paciente muda o status de rascunho para enviada
  await asUser(db, userId, "update public.triage_responses set status = 'enviada', submitted_at = now() where id = $1", [r.id]);
  return r.id;
}

async function firstSlot(userId: string, professionalId: string): Promise<string> {
  const rows = await asUser<{ professional_id: string; starts_at: string }>(
    db,
    userId,
    "select professional_id, starts_at from public.available_slots('cabelo', (now() at time zone 'America/Sao_Paulo')::date, 3) where professional_id = $1 limit 1",
    [professionalId],
  );
  expect(rows.length).toBe(1);
  return new Date(rows[0].starts_at).toISOString();
}

beforeAll(async () => {
  db = await createDb();
  await createUser(db, { id: PATIENT_A, email: "a@teste.com", complete: true, consent: true });
  await createUser(db, { id: PATIENT_B, email: "b@teste.com", complete: true, consent: true });
  await createUser(db, { id: MINOR, email: "menor@teste.com", complete: true, consent: true, birth: "2012-01-01" });
  await createUser(db, { id: STAFF, email: "staff@teste.com", role: "staff" });
  await createUser(db, { id: DOCTOR_1, email: "med1@teste.com", role: "doctor" });
  await createUser(db, { id: DOCTOR_2, email: "med2@teste.com", role: "doctor" });
  await createUser(db, { id: DIRECTOR, email: "dt@teste.com", role: "medical_director" });
  await createUser(db, { id: ADMIN, email: "admin@teste.com", role: "admin" });

  const [p1] = await asAdmin<{ id: string }>(
    db,
    "insert into public.professionals (user_id, full_name, council, council_number, council_uf) values ($1, 'Dra. Um', 'CRM', '11111', 'PR') returning id",
    [DOCTOR_1],
  );
  const [p2] = await asAdmin<{ id: string }>(
    db,
    "insert into public.professionals (user_id, full_name, council, council_number, council_uf) values ($1, 'Dr. Dois', 'CRM', '22222', 'PR') returning id",
    [DOCTOR_2],
  );
  prof1 = p1.id;
  prof2 = p2.id;
  for (const p of [prof1, prof2]) {
    await asAdmin(db, "insert into public.professional_fees (professional_id) values ($1)", [p]);
    for (let wd = 0; wd < 7; wd++) {
      await asAdmin(db, "insert into public.availability (professional_id, weekday, start_time, end_time) values ($1, $2, '00:00', '23:30')", [p, wd]);
    }
  }
});

describe("esquema e seed", () => {
  it("cria as 4 linhas de cuidado e a triagem v1 de cada uma", async () => {
    const lines = await asAdmin<{ n: number }>(db, "select count(*)::int n from public.care_lines where status = 'ativa'");
    const versions = await asAdmin<{ n: number }>(db, "select count(*)::int n from public.triage_versions where published_at is not null");
    expect(lines[0].n).toBe(4);
    expect(versions[0].n).toBe(4);
  });

  it("não existe tabela de pedidos de farmácia nem coluna ligando repasse a receita", async () => {
    const tables = await asAdmin<{ table_name: string }>(
      db,
      "select table_name from information_schema.tables where table_schema = 'public' and table_name ~ '(order|pedido|farmacia|pharmacy_order|cart|carrinho)'",
    );
    expect(tables).toEqual([]);
    const cols = await asAdmin<{ column_name: string }>(
      db,
      "select column_name from information_schema.columns where table_schema = 'public' and table_name in ('professional_fees', 'appointments') and column_name ~ '(document|receita|prescri|pharmac)'",
    );
    expect(cols).toEqual([]);
  });
});

describe("perfis", () => {
  it("paciente não consegue virar admin", async () => {
    await expect(asUser(db, PATIENT_A, "update public.profiles set role = 'admin' where id = $1", [PATIENT_A])).rejects.toThrow(/sem_permissao_para_mudar_papel/);
  });

  it("paciente não vê o perfil de outro paciente", async () => {
    const rows = await asUser(db, PATIENT_A, "select id from public.profiles where id = $1", [PATIENT_B]);
    expect(rows).toEqual([]);
  });
});

describe("triagem (dado de saúde)", () => {
  let triageB: string;
  beforeAll(async () => {
    triageB = await submittedTriage(PATIENT_B);
  });

  it("paciente A não lê a triagem do paciente B", async () => {
    const rows = await asUser(db, PATIENT_A, "select * from public.triage_responses where id = $1", [triageB]);
    expect(rows).toEqual([]);
  });

  it("staff e admin não leem nenhuma triagem", async () => {
    expect(await asUser(db, STAFF, "select * from public.triage_responses")).toEqual([]);
    expect(await asUser(db, ADMIN, "select * from public.triage_responses")).toEqual([]);
  });

  it("médico não lê a tabela de triagem diretamente", async () => {
    expect(await asUser(db, DOCTOR_1, "select * from public.triage_responses")).toEqual([]);
  });

  it("diretor técnico lê", async () => {
    const rows = await asUser(db, DIRECTOR, "select id from public.triage_responses where id = $1", [triageB]);
    expect(rows.length).toBe(1);
  });

  it("triagem enviada não pode mais ser alterada pelo paciente", async () => {
    await asUser(db, PATIENT_B, "update public.triage_responses set answers = '{}' where id = $1", [triageB]);
    const [row] = await asAdmin<{ answers: Record<string, unknown> }>(db, "select answers from public.triage_responses where id = $1", [triageB]);
    expect(row.answers).toHaveProperty("relato");
  });
});

describe("agenda e reserva", () => {
  it("bloqueia menor de 18 anos", async () => {
    const t = await submittedTriage(MINOR);
    const slot = await firstSlot(MINOR, prof1);
    await expect(
      asUser(db, MINOR, "select * from public.reserve_slot($1, $2, 'cabelo', 'primeira', $3)", [prof1, slot, t]),
    ).rejects.toThrow(/menor_de_idade/);
  });

  it("exige triagem enviada para a primeira consulta", async () => {
    const slot = await firstSlot(PATIENT_A, prof1);
    await expect(
      asUser(db, PATIENT_A, "select * from public.reserve_slot($1, $2, 'cabelo', 'primeira', null)", [prof1, slot]),
    ).rejects.toThrow(/triagem_necessaria/);
  });

  it("paciente não cria agendamento direto na tabela", async () => {
    await expect(
      asUser(
        db,
        PATIENT_A,
        "insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, price_cents) values ($1, $2, 'cabelo', now() + interval '3 days', now() + interval '3 days 30 minutes', 1)",
        [PATIENT_A, prof1],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("reserva com trava de 15 min, cobra o preço da linha e impede dois pacientes no mesmo horário", async () => {
    const tA = await submittedTriage(PATIENT_A);
    const tB = await submittedTriage(PATIENT_B);
    const slot = await firstSlot(PATIENT_A, prof1);

    const [appt] = await asUser<{ status: string; price_cents: number; hold_expires_at: string }>(
      db,
      PATIENT_A,
      "select * from public.reserve_slot($1, $2, 'cabelo', 'primeira', $3)",
      [prof1, slot, tA],
    );
    expect(appt.status).toBe("reservado");
    expect(appt.price_cents).toBe(9990);
    expect(new Date(appt.hold_expires_at).getTime()).toBeGreaterThan(Date.now());

    await expect(
      asUser(db, PATIENT_B, "select * from public.reserve_slot($1, $2, 'cabelo', 'primeira', $3)", [prof1, slot, tB]),
    ).rejects.toThrow(/horario_indisponivel/);

    const free = await asUser<{ starts_at: string }>(
      db,
      PATIENT_B,
      "select starts_at from public.available_slots('cabelo', (now() at time zone 'America/Sao_Paulo')::date, 3) where professional_id = $1",
      [prof1],
    );
    expect(free.map((r) => new Date(r.starts_at).toISOString())).not.toContain(slot);
  });

  it("cancelamento com mais de 2 h de antecedência não é cobrado e pede estorno", async () => {
    const [row] = await asAdmin<{ id: string }>(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
       values ($1, $2, 'cabelo', now() + interval '5 days', now() + interval '5 days 30 minutes', 'confirmado', 9990) returning id`,
      [PATIENT_B, prof2],
    );
    const [res] = await asUser<{ r: { charged: boolean } }>(db, PATIENT_B, "select public.cancel_appointment($1) r", [row.id]);
    expect(res.r.charged).toBe(false);
    const [after] = await asAdmin<{ status: string; refund_requested: boolean }>(db, "select status, refund_requested from public.appointments where id = $1", [row.id]);
    expect(after.status).toBe("cancelado");
    expect(after.refund_requested).toBe(true);
  });

  it("cancelamento a menos de 2 h é cobrado e mantém a consulta", async () => {
    const [row] = await asAdmin<{ id: string }>(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
       values ($1, $2, 'cabelo', now() + interval '1 hour', now() + interval '90 minutes', 'confirmado', 9990) returning id`,
      [PATIENT_B, prof2],
    );
    const [res] = await asUser<{ r: { charged: boolean } }>(db, PATIENT_B, "select public.cancel_appointment($1) r", [row.id]);
    expect(res.r.charged).toBe(true);
  });
});

describe("médico, documentos e repasse", () => {
  let apptId: string;
  let apptNoDoc: string;
  let docId: string;

  beforeAll(async () => {
    const t = await submittedTriage(PATIENT_A, "pele");
    const [a] = await asAdmin<{ id: string }>(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents, triage_response_id)
       values ($1, $2, 'pele', now() - interval '2 days', now() - interval '2 days' + interval '30 minutes', 'realizado', 9990, $3) returning id`,
      [PATIENT_A, prof1, t],
    );
    apptId = a.id;
    const [b] = await asAdmin<{ id: string }>(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
       values ($1, $2, 'pele', now() - interval '1 day', now() - interval '1 day' + interval '30 minutes', 'realizado', 9990) returning id`,
      [PATIENT_B, prof1],
    );
    apptNoDoc = b.id;
    const [d] = await asAdmin<{ id: string }>(
      db,
      "insert into public.clinical_documents (appointment_id, patient_id, professional_id, kind, title) values ($1, $2, $3, 'receita', 'Receita') returning id",
      [apptId, PATIENT_A, prof1],
    );
    docId = d.id;
  });

  it("médico da consulta lê a triagem pela função e a leitura é auditada", async () => {
    const [res] = await asUser<{ r: { answers: Record<string, unknown>; patient: { age: number } } }>(
      db,
      DOCTOR_1,
      "select public.get_triage_for_appointment($1) r",
      [apptId],
    );
    expect(res.r.answers).toHaveProperty("sexo", "M");
    expect(res.r.patient.age).toBeGreaterThanOrEqual(18);
    const audit = await asAdmin(db, "select * from public.audit_log where action = 'abriu_triagem' and actor_id = $1", [DOCTOR_1]);
    expect(audit.length).toBeGreaterThan(0);
  });

  it("outro médico não lê a triagem dessa consulta", async () => {
    await expect(asUser(db, DOCTOR_2, "select public.get_triage_for_appointment($1)", [apptId])).rejects.toThrow(/sem_permissao/);
  });

  it("staff e admin não veem documentos clínicos; o paciente vê os seus", async () => {
    expect(await asUser(db, STAFF, "select * from public.clinical_documents")).toEqual([]);
    expect(await asUser(db, ADMIN, "select * from public.clinical_documents")).toEqual([]);
    expect((await asUser(db, PATIENT_A, "select id from public.clinical_documents")).length).toBe(1);
    expect(await asUser(db, PATIENT_B, "select id from public.clinical_documents")).toEqual([]);
  });

  it("paciente só registra escolha de farmácia para o próprio documento", async () => {
    await asUser(db, PATIENT_A, "insert into public.pharmacy_choice_events (user_id, document_id, choice) values ($1, $2, 'baixou_pdf')", [PATIENT_A, docId]);
    await expect(
      asUser(db, PATIENT_B, "insert into public.pharmacy_choice_events (user_id, document_id, choice) values ($1, $2, 'farmashop')", [PATIENT_B, docId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("repasse conta atendimentos realizados, com ou sem receita", async () => {
    const [res] = await asUser<{ r: { payouts: { professional_id: string; consults: number; total_cents: number }[] } }>(
      db,
      ADMIN,
      "select public.report_summary(now() - interval '30 days', now() + interval '1 day') r",
    );
    const p = res.r.payouts.find((x) => x.professional_id === prof1)!;
    expect(p.consults).toBe(2); // uma com receita, outra sem
    expect(p.total_cents).toBe(2 * 6000);
    expect(apptNoDoc).toBeTruthy();
  });

  it("paciente não acessa o relatório", async () => {
    await expect(asUser(db, PATIENT_A, "select public.report_summary(now() - interval '1 day', now())")).rejects.toThrow(/sem_permissao/);
  });
});

describe("governança da triagem", () => {
  it("só o diretor técnico publica nova versão", async () => {
    const def = JSON.stringify({ care_line: "cabelo", title: "x", questions: [{ id: "a", type: "text", label: "Pergunta teste" }] });
    await expect(asUser(db, ADMIN, "select * from public.publish_triage_version('cabelo', $1::jsonb)", [def])).rejects.toThrow(/sem_permissao/);
    const [v] = await asUser<{ version: number }>(db, DIRECTOR, "select * from public.publish_triage_version('cabelo', $1::jsonb)", [def]);
    expect(v.version).toBe(2);
  });
});
