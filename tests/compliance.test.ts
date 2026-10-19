// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { buildSeedSql } from "@/content/seed";

/**
 * Varredura de conformidade no código do front-end.
 * Se algum destes testes falhar, NÃO "conserte" o teste: conserte o texto ou o código.
 */
const root = resolve(__dirname, "..");
const srcDir = join(root, "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(srcDir).filter((f) => /\.(tsx?|css|html)$/.test(f));
const read = (f: string) => readFileSync(f, "utf8");

// Ativos e medicamentos comuns em telemedicina de manipulados. O site não pode citar nenhum.
const FORBIDDEN_ACTIVES = [
  "minoxidil", "finasterid", "dutasterid", "espironolactona", "tadalafil", "sildenafil", "tirzepatid", "semaglutid",
  "liraglutid", "ozempic", "mounjaro", "wegovy", "melatonin", "isotretino", "tretino", "hidroquinon", "biotina",
  "testosteron", "oxandrolon", "gestrinon", "sibutramin", "anfepramon", "fluoxetin", "zolpidem", "creatina",
];
const FORBIDDEN_COMMERCE = ["carrinho", "adicionar ao carrinho", "comprar fórmula", "compre sua fórmula", "frete grátis", "add to cart"];
const FORBIDDEN_PROMISES = [/\bgarantid[oa]s?\b/, /\bcura\b/, /\bcuramos\b/, /\bmilagr/, /\bemagreça\b/, /\bperca \d+ ?kg\b/, /\bperca peso\b/];

describe("conformidade do texto do site", () => {
  it("nenhum nome de ativo ou medicamento no front-end", () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = read(f).toLowerCase();
      for (const w of FORBIDDEN_ACTIVES) if (text.includes(w)) hits.push(`${relative(root, f)}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it("nenhum termo de loja/carrinho de fórmula", () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = read(f).toLowerCase();
      for (const w of FORBIDDEN_COMMERCE) if (text.includes(w)) hits.push(`${relative(root, f)}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it("nenhuma promessa de resultado no conteúdo exibido", () => {
    const contentFiles = files.filter((f) => f.includes(`${join("src", "content")}`) || f.includes(join("src", "pages", "public")));
    const hits: string[] = [];
    for (const f of contentFiles) {
      const text = read(f).toLowerCase();
      for (const w of FORBIDDEN_PROMISES) if (w.test(text)) hits.push(`${relative(root, f)}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it("nenhum dado de saúde em URL (sem ?motivo=, ?linha= etc.)", () => {
    const hits = files.filter((f) => /[?&](motivo|linha|care_line|sintoma|triagem)=/i.test(read(f)));
    expect(hits.map((f) => relative(root, f))).toEqual([]);
  });

  it("localStorage só é usado para o aceite de cookies", () => {
    const users = files.filter((f) => /localStorage\.(getItem|setItem)|sessionStorage\.|indexedDB\./.test(read(f)));
    expect(users.map((f) => relative(root, f))).toEqual([join("src", "lib", "analytics.ts")]);
  });

  it("a Prumo não chama nenhum endpoint da farmácia (só link)", () => {
    const hits = files.filter((f) => /fetch\([^)]*farmashop/i.test(read(f)) || /farmashop[^"\n]*\/api\//i.test(read(f)));
    expect(hits).toEqual([]);
  });
});

describe("seed do banco", () => {
  it("supabase/seed.sql está sincronizado com src/content (rode npm run seed:triage)", () => {
    const current = readFileSync(join(root, "supabase", "seed.sql"), "utf8");
    expect(current).toBe(buildSeedSql());
  });
});
