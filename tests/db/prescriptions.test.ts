// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, createDb, createUser, type Db } from "./harness";

/** Receita montada na consulta e tabela de ativos do médico: quem vê e quem escreve. */

const PATIENT = "a1111111-1111-4111-8111-111111111111";
const OTHER_PATIENT = "a2222222-2222-4222-8222-222222222222";
const STAFF = "a4444444-4444-4444-8444-444444444444";
const ADMIN = "a8888888-8888-4888-8888-888888888888";
const DOCTOR_1 = "a5555555-5555-4555-8555-555555555555";
const DOCTOR_2 = "a6666666-6666-4666-8666-666666666666";
const DIRECTOR = "a7777777-7777-4777-8777-777777777777";

const RX = { form: "Cápsulas", quantity: "60 cápsulas", directions: "1 ao dia", items: [{ name: "Componente A", dose: "100 mg" }] };

let db: Db;
let prof1: string;
let prof2: string;

let slot = 0;
async function appointment(status = "confirmado"): Promise<string> {
  // um horário de 30 min diferente a cada chamada (a agenda não aceita sobreposição)
  const offset = `${(slot++) * 30} minutes`;
  const [a] = await asAdmin<{ id: string }>(
    db,
    `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
     values ($1, $2, 'energia-e-disposicao', now() - interval '3 hours' + $4::interval, now() - interval '150 minutes' + $4::interval, $3, 9990) returning id`,
    [PATIENT, prof1, status, offset],
  );
  return a.id;
}

const finish = (user: string, appt: string, outcome: string, rx: unknown) =>
  asUser<{ r: { document_id: string | null } }>(db, user, "select public.finish_consultation($1, $2, null, $3) r", [
    appt,
    outcome,
    rx === null ? null : JSON.stringify(rx),
  ]);

beforeAll(async () => {
  db = await createDb();
  await createUser(db, { id: PATIENT, email: "p@teste.com", complete: true, consent: true });
  await createUser(db, { id: OTHER_PATIENT, email: "o@teste.com", complete: true, consent: true });
  await createUser(db, { id: STAFF, email: "s@teste.com", role: "staff" });
  await createUser(db, { id: ADMIN, email: "ad@teste.com", role: "admin" });
  await createUser(db, { id: DOCTOR_1, email: "m1@teste.com", role: "doctor" });
  await createUser(db, { id: DOCTOR_2, email: "m2@teste.com", role: "doctor" });
  await createUser(db, { id: DIRECTOR, email: "dt@teste.com", role: "medical_director" });
  const [p1] = await asAdmin<{ id: string }>(
    db,
    "insert into public.professionals (user_id, full_name, council, council_number, council_uf) values ($1, 'Dra. Um', 'CRM', '1', 'PR') returning id",
    [DOCTOR_1],
  );
  const [p2] = await asAdmin<{ id: string }>(
    db,
    "insert into public.professionals (user_id, full_name, council, council_number, council_uf) values ($1, 'Dr. Dois', 'CRM', '2', 'PR') returning id",
    [DOCTOR_2],
  );
  prof1 = p1.id;
  prof2 = p2.id;
});

describe("tabela de ativos do médico", () => {
  it("cada médico vê e edita só a própria lista; equipe e paciente não veem nada", async () => {
    await asUser(db, DOCTOR_1, "insert into public.doctor_actives (professional_id, name, default_dose) values ($1, 'Componente A', '100 mg')", [prof1]);
    expect((await asUser(db, DOCTOR_1, "select id from public.doctor_actives")).length).toBe(1);
    for (const u of [DOCTOR_2, STAFF, ADMIN, PATIENT]) expect(await asUser(db, u, "select id from public.doctor_actives")).toEqual([]);
    await expect(
      asUser(db, DOCTOR_2, "insert into public.doctor_actives (professional_id, name) values ($1, 'X')", [prof1]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("receita da consulta", () => {
  let appt: string;
  let docId: string;

  beforeAll(async () => {
    appt = await appointment();
  });

  it("o médico salva o rascunho e o paciente ainda não vê", async () => {
    await asUser(
      db,
      DOCTOR_1,
      "insert into public.prescriptions (appointment_id, patient_id, professional_id, form, quantity, directions, items) values ($1, $2, $3, 'Cápsulas', '', '', $4)",
      [appt, PATIENT, prof1, JSON.stringify(RX.items)],
    );
    expect((await asUser(db, DOCTOR_1, "select id from public.prescriptions")).length).toBe(1);
    expect(await asUser(db, PATIENT, "select id from public.prescriptions")).toEqual([]);
  });

  it("outro médico não monta receita nem encerra consulta que não é dele", async () => {
    await expect(
      asUser(
        db,
        DOCTOR_2,
        "insert into public.prescriptions (appointment_id, patient_id, professional_id) values ($1, $2, $3)",
        [await appointment(), PATIENT, prof2],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(finish(DOCTOR_2, appt, "receita_emitida", RX)).rejects.toThrow(/sem_permissao/);
  });

  it("recusa receita incompleta", async () => {
    await expect(finish(DOCTOR_1, appt, "receita_emitida", { ...RX, items: [{ name: "A", dose: "" }] })).rejects.toThrow(/receita_incompleta/);
    await expect(finish(DOCTOR_1, appt, "receita_emitida", null)).rejects.toThrow(/receita_vazia/);
  });

  it("encerrar emite a receita: consulta realizada, documento do paciente e receita visível para ele", async () => {
    const [res] = await finish(DOCTOR_1, appt, "receita_emitida", RX);
    docId = res.r.document_id!;
    expect(docId).toBeTruthy();
    const [a] = await asAdmin<{ status: string }>(db, "select status from public.appointments where id = $1", [appt]);
    expect(a.status).toBe("realizado");
    const rows = await asUser<{ items: { name: string }[]; document_id: string }>(db, PATIENT, "select items, document_id from public.prescriptions");
    expect(rows).toHaveLength(1);
    expect(rows[0].document_id).toBe(docId);
    expect(rows[0].items[0].name).toBe("Componente A");
    const docs = await asUser<{ kind: string }>(db, PATIENT, "select kind from public.clinical_documents order by kind");
    expect(docs.map((d) => d.kind).sort()).toEqual(["orientacao", "receita"]);
  });

  it("receita emitida não muda mais", async () => {
    await expect(finish(DOCTOR_1, appt, "receita_emitida", RX)).rejects.toThrow(/receita_ja_emitida/);
    const changed = await asUser(db, DOCTOR_1, "update public.prescriptions set quantity = '90' where appointment_id = $1 returning id", [appt]);
    expect(changed).toEqual([]);
  });

  it("equipe, admin e outro paciente não veem a receita; diretor técnico vê", async () => {
    for (const u of [STAFF, ADMIN, OTHER_PATIENT, DOCTOR_2]) expect(await asUser(db, u, "select id from public.prescriptions")).toEqual([]);
    expect((await asUser(db, DIRECTOR, "select id from public.prescriptions")).length).toBeGreaterThan(0);
  });

  it("encerrar sem receita não cria receita e o repasse é o mesmo", async () => {
    const other = await appointment();
    const [res] = await finish(DOCTOR_1, other, "orientacao", null);
    expect(res.r.document_id).toBeNull();
    const [r] = await asUser<{ r: { payouts: { professional_id: string; consults: number; total_cents: number }[] } }>(
      db,
      ADMIN,
      "select public.report_summary(now() - interval '1 day', now() + interval '1 day') r",
    );
    const p = r.r.payouts.find((x) => x.professional_id === prof1)!;
    expect(p.consults).toBe(2);
    expect(p.total_cents).toBe(2 * 6000);
  });
});
