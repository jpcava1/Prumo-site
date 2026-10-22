// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, createDb, createUser, type Db } from "./harness";

/** "Seu Plano" e biblioteca do profissional: quem vê, quem escreve e a emissão separada da receita. */

const PATIENT = "c1111111-1111-4111-8111-111111111111";
const OTHER_PATIENT = "c2222222-2222-4222-8222-222222222222";
const STAFF = "c4444444-4444-4444-8444-444444444444";
const ADMIN = "c8888888-8888-4888-8888-888888888888";
const DOCTOR_1 = "c5555555-5555-4555-8555-555555555555";
const DOCTOR_2 = "c6666666-6666-4666-8666-666666666666";

const PLAN = [
  { section: "objetivo", title: "Mais energia" },
  { section: "cafe", title: "Iogurte com fruta", detail: "1 pote" },
  { section: "exame", title: "Hemograma completo" },
];
const RX = { form: "Cápsulas", quantity: "60", directions: "1 ao dia", items: [{ name: "Componente A", dose: "10 mg" }] };

let db: Db;
let prof1: string;
let prof2: string;
let appt: string;

const finish = (user: string, a: string, rx: unknown, plan: unknown) =>
  asUser<{ r: { document_id: string | null; plan_document_id: string | null } }>(
    db,
    user,
    "select public.finish_consultation($1, 'receita_emitida', null, $2, $3) r",
    [a, rx === null ? null : JSON.stringify(rx), plan === null ? null : JSON.stringify(plan)],
  );

beforeAll(async () => {
  db = await createDb();
  await createUser(db, { id: PATIENT, email: "p@teste.com", complete: true, consent: true });
  await createUser(db, { id: OTHER_PATIENT, email: "o@teste.com", complete: true, consent: true });
  await createUser(db, { id: STAFF, email: "s@teste.com", role: "staff" });
  await createUser(db, { id: ADMIN, email: "a@teste.com", role: "admin" });
  await createUser(db, { id: DOCTOR_1, email: "m1@teste.com" });
  await createUser(db, { id: DOCTOR_2, email: "m2@teste.com" });
  const ins = "insert into public.professionals (user_id, full_name, council, council_number, council_uf) values ($1, $2, 'CRM', $3, 'PR') returning id";
  prof1 = (await asAdmin<{ id: string }>(db, ins, [DOCTOR_1, "Dra. Um", "1"]))[0].id;
  prof2 = (await asAdmin<{ id: string }>(db, ins, [DOCTOR_2, "Dr. Dois", "2"]))[0].id;
  appt = (
    await asAdmin<{ id: string }>(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
       values ($1, $2, 'suplementacao', now() - interval '40 minutes', now() - interval '10 minutes', 'confirmado', 9990) returning id`,
      [PATIENT, prof1],
    )
  )[0].id;
});

describe("biblioteca do profissional", () => {
  it("cada profissional vê só os próprios itens; equipe e paciente não veem nada", async () => {
    await asUser(db, DOCTOR_1, "insert into public.plan_templates (professional_id, section, title) values ($1, 'rotina', 'Caminhada')", [prof1]);
    expect(await asUser(db, DOCTOR_1, "select id from public.plan_templates")).toHaveLength(1);
    for (const u of [DOCTOR_2, STAFF, ADMIN, PATIENT]) expect(await asUser(db, u, "select id from public.plan_templates")).toEqual([]);
    await expect(
      asUser(db, DOCTOR_2, "insert into public.plan_templates (professional_id, section, title) values ($1, 'rotina', 'X')", [prof1]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, DOCTOR_1, "insert into public.plan_templates (professional_id, section, title) values ($1, 'outra', 'X')", [prof1]),
    ).rejects.toThrow(/check/);
  });
});

describe("Seu Plano", () => {
  it("rascunho: só o profissional da consulta vê; o paciente ainda não", async () => {
    await asUser(
      db,
      DOCTOR_1,
      "insert into public.care_plans (appointment_id, patient_id, professional_id, items) values ($1, $2, $3, $4)",
      [appt, PATIENT, prof1, JSON.stringify(PLAN)],
    );
    expect(await asUser(db, DOCTOR_1, "select id from public.care_plans")).toHaveLength(1);
    expect(await asUser(db, PATIENT, "select id from public.care_plans")).toEqual([]);
    await expect(
      asUser(db, DOCTOR_2, "insert into public.care_plans (appointment_id, patient_id, professional_id) values ($1, $2, $3)", [appt, PATIENT, prof2]),
    ).rejects.toThrow();
  });

  it("recusa item sem texto ou seção inválida", async () => {
    await expect(finish(DOCTOR_1, appt, RX, [{ section: "rotina", title: " " }])).rejects.toThrow(/plano_invalido/);
    await expect(finish(DOCTOR_1, appt, RX, [{ section: "remedio", title: "X" }])).rejects.toThrow(/plano_invalido/);
  });

  it("encerrar emite dois documentos separados: Seu Plano e receita", async () => {
    const [res] = await finish(DOCTOR_1, appt, RX, PLAN);
    expect(res.r.document_id).toBeTruthy();
    expect(res.r.plan_document_id).toBeTruthy();
    expect(res.r.plan_document_id).not.toBe(res.r.document_id);
    const docs = await asUser<{ kind: string }>(db, PATIENT, "select kind from public.clinical_documents order by kind");
    expect(docs.map((d) => d.kind).sort()).toEqual(["orientacao", "plano", "receita"]);
    const [plan] = await asUser<{ items: { title: string }[]; document_id: string }>(db, PATIENT, "select items, document_id from public.care_plans");
    expect(plan.document_id).toBe(res.r.plan_document_id);
    expect(plan.items.map((i) => i.title)).toEqual(PLAN.map((p) => p.title));
  });

  it("plano emitido não muda mais", async () => {
    expect(await asUser(db, DOCTOR_1, "update public.care_plans set items = '[]' where appointment_id = $1 returning id", [appt])).toEqual([]);
  });

  it("equipe, admin, outro paciente e outro profissional não veem o plano", async () => {
    for (const u of [STAFF, ADMIN, OTHER_PATIENT, DOCTOR_2]) expect(await asUser(db, u, "select id from public.care_plans")).toEqual([]);
  });

  it("sem itens, não cria o documento do plano", async () => {
    const a2 = (
      await asAdmin<{ id: string }>(
        db,
        `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
         values ($1, $2, 'suplementacao', now() - interval '3 hours', now() - interval '150 minutes', 'confirmado', 9990) returning id`,
        [OTHER_PATIENT, prof1],
      )
    )[0].id;
    const [res] = await finish(DOCTOR_1, a2, RX, null);
    expect(res.r.plan_document_id).toBeNull();
    expect(res.r.document_id).toBeTruthy();
  });
});
