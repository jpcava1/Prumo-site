/**
 * Gera supabase/seed.sql a partir do conteúdo em src/content (linhas de cuidado e triagem v1).
 * Rode: npm run seed:triage
 * O teste tests/seed.test.ts falha se o seed.sql ficar diferente do gerado.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSeedSql } from "../src/content/seed";

const out = resolve(__dirname, "../supabase/seed.sql");
writeFileSync(out, buildSeedSql());
console.log("seed gerado em", out);
