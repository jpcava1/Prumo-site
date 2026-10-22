import { useMemo, useState } from "react";
import { Bookmark, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/useData";
import { api, type PlanItem, type PlanTemplate } from "@/lib/api";
import { PLAN_SECTIONS, PLAN_SUGGESTIONS, type PlanSection } from "@/content/planSuggestions";
import { cn } from "@/lib/utils";

/*
 * "Seu Plano": biblioteca do profissional e editor usado durante a consulta.
 * Nutricionista: dieta (4 refeições) e rotina. Médico: rotina e cuidados.
 * Os dois: objetivos, metas e exames.
 */

export type ProKind = "medico" | "nutricionista" | "educador_fisico";

export interface PlanTab {
  key: string;
  label: string;
  sections: PlanSection[];
}

export function planTabs(kind: ProKind): PlanTab[] {
  if (kind === "educador_fisico")
    return [
      { key: "treino", label: "Treino", sections: ["rotina"] },
      { key: "cuidados", label: "Cuidados", sections: ["cuidado"] },
      { key: "metas", label: "Objetivos e metas", sections: ["objetivo", "meta"] },
    ];
  return kind === "nutricionista"
    ? [
        { key: "dieta", label: "Dieta", sections: ["cafe", "almoco", "lanche", "jantar"] },
        { key: "rotina", label: "Rotina", sections: ["rotina"] },
        { key: "metas", label: "Objetivos e metas", sections: ["objetivo", "meta"] },
        { key: "exames", label: "Exames", sections: ["exame"] },
      ]
    : [
        { key: "rotina", label: "Rotina e cuidados", sections: ["rotina", "cuidado"] },
        { key: "metas", label: "Objetivos e metas", sections: ["objetivo", "meta"] },
        { key: "exames", label: "Exames", sections: ["exame"] },
      ];
}

function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-border p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            active === t.key ? "bg-primary text-primary-ink" : "text-muted hover:text-primary",
          )}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 tabular-nums opacity-70">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

const chip =
  "inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-40";

/* Editor usado na consulta ----------------------------------------------------------- */
export function PlanEditor({
  kind,
  items,
  onChange,
  templates,
  disabled,
}: {
  kind: ProKind;
  items: PlanItem[];
  onChange: (items: PlanItem[]) => void;
  templates: PlanTemplate[];
  disabled?: boolean;
}) {
  const tabs = planTabs(kind);
  const [tab, setTab] = useState(tabs[0].key);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const current = tabs.find((t) => t.key === tab) ?? tabs[0];
  const has = (s: PlanSection, title: string) => items.some((i) => i.section === s && i.title === title);
  const add = (it: PlanItem) => !has(it.section, it.title) && onChange([...items, { section: it.section, title: it.title, detail: it.detail ?? null }]);
  const remove = (idx: number) => onChange(items.filter((_, n) => n !== idx));

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs.map((t) => ({ ...t, count: items.filter((i) => t.sections.includes(i.section)).length }))} active={tab} onChange={setTab} />
      {current.sections.map((s) => {
        const mine = templates.filter((t) => t.section === s);
        const suggestions = PLAN_SUGGESTIONS.filter((x) => x.section === s && !mine.some((m) => m.title === x.title));
        return (
          <div key={s} className="space-y-2 rounded-card border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{PLAN_SECTIONS[s].label}</p>
            <ul className="space-y-1">
              {items.map((it, idx) =>
                it.section !== s ? null : (
                  <li key={idx} className="flex items-start justify-between gap-2 rounded-lg bg-primary-soft/50 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block font-medium">{it.title}</span>
                      {it.detail && <span className="block text-sm text-muted">{it.detail}</span>}
                    </span>
                    {!disabled && (
                      <button type="button" onClick={() => remove(idx)} className="shrink-0 rounded p-1 text-muted hover:text-danger" aria-label={`Remover ${it.title}`}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ),
              )}
              {!items.some((i) => i.section === s) && <li className="text-sm text-muted">Nada adicionado ainda.</li>}
            </ul>
            {!disabled && (
              <>
                {mine.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {mine.map((t) => (
                      <button key={t.id} type="button" disabled={has(s, t.title)} onClick={() => add(t)} className={cn(chip, "border-primary/40 hover:border-primary hover:text-primary")} title={t.detail ?? undefined}>
                        <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((t) => (
                      <button key={t.title} type="button" disabled={has(s, t.title)} onClick={() => add(t)} className={cn(chip, "border-border text-muted hover:border-primary hover:text-primary")} title={t.detail}>
                        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="flex gap-2 pt-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = (draft[s] ?? "").trim();
                    if (!v) return;
                    add({ section: s, title: v });
                    setDraft({ ...draft, [s]: "" });
                  }}
                >
                  <Input
                    aria-label={`Escrever item em ${PLAN_SECTIONS[s].label}`}
                    placeholder="Escrever outro item"
                    value={draft[s] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [s]: e.target.value })}
                    className="h-10"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="h-10 shrink-0">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </form>
              </>
            )}
          </div>
        );
      })}
      {!disabled && (
        <p className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" /> da sua biblioteca</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> sugestão da Prumo</span>
        </p>
      )}
    </div>
  );
}

/* Biblioteca: itens salvos pelo profissional ----------------------------------------- */
export function TemplatesManager({ sections }: { sections: PlanSection[] }) {
  const { data, loading, reload } = useAsync(() => api.doctorListTemplates(), []);
  const [section, setSection] = useState<PlanSection>(sections[0]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = useMemo(() => (data ?? []).filter((t) => sections.includes(t.section)), [data, sections]);

  async function save(input: { section: PlanSection; title: string; detail?: string | null }) {
    setErr(null);
    try {
      await api.doctorSaveTemplate({ section: input.section, title: input.title, detail: input.detail ?? null });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function saveAll(s: PlanSection) {
    setBusy(true);
    for (const x of PLAN_SUGGESTIONS.filter((x) => x.section === s && !mine.some((m) => m.section === s && m.title === x.title))) {
      await api.doctorSaveTemplate({ section: s, title: x.title, detail: x.detail ?? null }).catch(() => undefined);
    }
    setBusy(false);
    reload();
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {sections.map((s) => {
            const list = mine.filter((t) => t.section === s);
            const sugg = PLAN_SUGGESTIONS.filter((x) => x.section === s && !list.some((m) => m.title === x.title));
            return (
              <section key={s} className="rounded-card border border-border p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{PLAN_SECTIONS[s].label}</h3>
                  <span className="text-sm text-muted tabular-nums">{list.length} salvos</span>
                </div>
                <ul className="divide-y divide-border">
                  {list.length === 0 && <li className="py-2 text-sm text-muted">Nada salvo ainda. Use as sugestões abaixo ou escreva os seus.</li>}
                  {list.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block font-medium">{t.title}</span>
                        {t.detail && <span className="block text-sm text-muted">{t.detail}</span>}
                      </span>
                      <button type="button" onClick={async () => { await api.doctorDeleteTemplate(t.id); reload(); }} className="shrink-0 rounded p-1.5 text-muted hover:text-danger" aria-label={`Apagar ${t.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                {sugg.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1 text-sm font-medium text-muted">
                        <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Sugestões da Prumo
                      </p>
                      <Button size="sm" variant="ghost" loading={busy} onClick={() => saveAll(s)}>
                        Salvar todas
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sugg.map((x) => (
                        <button key={x.title} type="button" onClick={() => save(x)} className={cn(chip, "border-border hover:border-primary hover:text-primary")} title={x.detail}>
                          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{x.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <form
          className="space-y-4 self-start rounded-card border border-border p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return setErr("Escreva o texto do item.");
            await save({ section, title, detail: detail || null });
            setTitle("");
            setDetail("");
          }}
        >
          <p className="font-semibold">Novo item</p>
          {sections.length > 1 && (
            <Field label="Onde entra" htmlFor="tpl-sec">
              <select id="tpl-sec" value={section} onChange={(e) => setSection(e.target.value as PlanSection)} className="h-12 w-full rounded-xl border border-border bg-surface px-3">
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {PLAN_SECTIONS[s].label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Texto" htmlFor="tpl-title">
            <Input id="tpl-title" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Detalhe (opcional)" htmlFor="tpl-detail" hint="Quantidade, horário ou como fazer.">
            <Input id="tpl-detail" maxLength={400} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full">
            Salvar na biblioteca
          </Button>
          {err && <Notice tone="danger">{err}</Notice>}
        </form>
      </div>
    </div>
  );
}

export { Tabs as PlanTabsBar };
