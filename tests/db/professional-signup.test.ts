// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, createDb, createUser, type Db } from "./harness";

/** Cadastro do profissional pelo site, horários por dia e a agenda do paciente. */

const NUTRI = "b1111111-1111-4111-8111-111111111111";
const OTHER = "b2222222-2222-4222-8222-222222222222";
const ADMIN = "b8888888-8888-4888-8888-888888888888";
const PATIENT = "b3333333-3333-4333-8333-333333333333";

let db: Db;
let profId: string;
let day: string;

const register = (user: string, overrides: Record<string, unknown> = {}) => {
  const a = { kind: "nutricionista", name: "Ana Nutri", council: "1234", uf: "PR", inst: "UEL", year: 2025, spec: null, rqe: null, ...overrides };
  return asUser<{ r: { id: string; council: string; active: boolean; approval: string; care_lines: string[] } }>(
    db,
    user,
    "select to_jsonb(public.register_professional($1, $2, $3, $4, $5, $6, $7, $8, null, '43999990000')) r",
    [a.kind, a.name, a.council, a.uf, a.inst, a.year, a.spec, a.rqe],
  );
};

const slotsFor = async (line: string) =>
  (
    await asUser<{ professional_id: string; starts_at: string }>(
      db,
      PATIENT,
      "select professional_id, starts_at from public.available_slots($1, (now() at time zone 'America/Sao_Paulo')::date, 7)",
      [line],
    )
  ).filter((s) => s.professional_id === profId);

beforeAll(async () => {
  db = await createDb();
  await createUser(db, { id: NUTRI, email: "nutri@teste.com" });
  await createUser(db, { id: OTHER, email: "outro@teste.com" });
  await createUser(db, { id: ADMIN, email: "admin@teste.com", role: "admin" });
  await createUser(db, { id: PATIENT, email: "pac@teste.com", complete: true, consent: true });
  const [d] = await asAdmin<{ d: string }>(db, "select to_char((now() at time zone 'America/Sao_Paulo')::date + 2, 'YYYY-MM-DD') d");
  day = d.d;
});

describe("cadastro do profissional", () => {
  it("especialidade sem RQE é recusada", async () => {
    await expect(register(NUTRI, { spec: "Esportiva" })).rejects.toThrow(/especialidade_sem_rqe/);
  });

  it("cria cadastro pendente, inativo, com CRN e as linhas Dieta e Suplementação; o papel do perfil não muda", async () => {
    const [res] = await register(NUTRI);
    profId = res.r.id;
    expect(res.r).toMatchObject({ council: "CRN", active: false, approval: "pendente", care_lines: ["dieta", "suplementacao"] });
    const [p] = await asAdmin<{ role: string }>(db, "select role from public.profiles where id = $1", [NUTRI]);
    expect(p.role).toBe("patient");
    await expect(register(NUTRI)).rejects.toThrow(/profissional_ja_cadastrado/);
  });

  it("personal trainer se cadastra com CREF e só na linha Treino", async () => {
    const [res] = await register(OTHER, { kind: "educador_fisico", name: "Paulo Personal", council: "012345" });
    expect(res.r).toMatchObject({ council: "CREF", approval: "pendente", care_lines: ["treino"] });
    await asAdmin(db, "delete from public.professional_fees where professional_id = $1", [res.r.id]);
    await asAdmin(db, "delete from public.professionals where id = $1", [res.r.id]);
  });

  it("o profissional vê o próprio cadastro pendente; o paciente não", async () => {
    expect(await asUser(db, NUTRI, "select id from public.professionals where id = $1", [profId])).toHaveLength(1);
    expect(await asUser(db, PATIENT, "select id from public.professionals where id = $1", [profId])).toEqual([]);
  });

  it("o profissional não se aprova sozinho", async () => {
    const changed = await asUser(db, NUTRI, "update public.professionals set active = true, approval = 'aprovado' where id = $1 returning id", [profId]);
    expect(changed).toEqual([]);
  });
});

describe("horários por dia", () => {
  it("só o próprio profissional abre horários na agenda dele", async () => {
    await asUser(db, NUTRI, "insert into public.availability_dates (professional_id, day, start_time, end_time) values ($1, $2, '08:00', '10:00')", [profId, day]);
    await expect(
      asUser(db, OTHER, "insert into public.availability_dates (professional_id, day, start_time, end_time) values ($1, $2, '10:00', '12:00')", [profId, day]),
    ).rejects.toThrow(/row-level security/);
    expect(await asUser(db, PATIENT, "select id from public.availability_dates")).toEqual([]);
  });

  it("enquanto pendente, nenhum horário aparece para o paciente", async () => {
    expect(await slotsFor("suplementacao")).toEqual([]);
  });

  it("depois da aprovação, os horários do dia aparecem só nas linhas da nutricionista", async () => {
    await asUser(db, ADMIN, "update public.professionals set approval = 'aprovado', active = true where id = $1", [profId]);
    const slots = await slotsFor("suplementacao");
    expect(slots).toHaveLength(4);
    expect(await slotsFor("treino")).toEqual([]);
  });

  it("horário reservado sai da lista", async () => {
    const [first] = await slotsFor("suplementacao");
    await asAdmin(
      db,
      `insert into public.appointments (patient_id, professional_id, care_line, starts_at, ends_at, status, price_cents)
       values ($1, $2, 'suplementacao', $3, $3::timestamptz + interval '30 minutes', 'confirmado', 9990)`,
      [PATIENT, profId, first.starts_at],
    );
    expect(await slotsFor("suplementacao")).toHaveLength(3);
  });
});
