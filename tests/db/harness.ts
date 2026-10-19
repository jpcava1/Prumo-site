import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Sobe um Postgres em memória (PGlite) com um "auth" mínimo igual ao do Supabase,
 * roda as migrations (menos a de Storage, que só existe no Supabase) e o seed.
 * Permite testar RLS de verdade, trocando de papel e de usuário.
 */
const root = resolve(__dirname, "../..");

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
`;

const GRANTS = `
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;
`;

export async function createDb() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(AUTH_STUB);
  const dir = resolve(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.includes("storage")).sort();
  for (const f of files) await db.exec(readFileSync(resolve(dir, f), "utf8"));
  await db.exec(readFileSync(resolve(root, "supabase/seed.sql"), "utf8"));
  await db.exec(GRANTS);
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

/** Executa como superusuário (equivale ao service role / migrations). */
export async function asAdmin<T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []) {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  return (await db.query<T>(sql, params)).rows;
}

/** Executa como um usuário logado (papel authenticated + auth.uid()). */
export async function asUser<T = Record<string, unknown>>(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

export async function createUser(
  db: Db,
  opts: { id: string; email: string; role?: string; complete?: boolean; birth?: string; consent?: boolean },
) {
  await asAdmin(db, "insert into auth.users (id, email) values ($1, $2)", [opts.id, opts.email]);
  if (opts.role) await asAdmin(db, "update public.profiles set role = $2 where id = $1", [opts.id, opts.role]);
  if (opts.complete) {
    const cpfBase = opts.id.replace(/\D/g, "").padEnd(11, "7").slice(0, 11);
    await asAdmin(
      db,
      "update public.profiles set full_name = 'Paciente Teste', cpf = $2, birth_date = $3, phone = '43999990000' where id = $1",
      [opts.id, cpfBase, opts.birth ?? "1990-05-10"],
    );
  }
  if (opts.consent) {
    await asAdmin(db, "insert into public.consents (user_id, type, version) values ($1, 'dados_saude', 'v1')", [opts.id]);
  }
}
