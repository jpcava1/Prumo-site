import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import { policy } from "@/config/site";
import { formatBRL } from "@/lib/utils";
import { track } from "@/lib/analytics";

/**
 * Landing da página inicial: tela 1 (foto da corredora com o fio de prumo) e
 * tela 2 (três painéis com pop-up). Os botões levam ao fluxo /comecar; o motivo
 * vai por estado da navegação, nunca pela URL.
 */

export function LandingHero({ price }: { price: number | null }) {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero-bg" aria-hidden>
        <img src="/img/hero-corrida.jpg" alt="" width={1664} height={2080} />
        <div className="lp-hero-blur lp-hero-blur-top" />
        <div className="lp-hero-blur lp-hero-blur-bottom" />
      </div>
      <div className="lp-hero-inner">
        <div className="lp-plumb" aria-hidden>
          <div className="lp-plumb-line" />
          <svg className="lp-plumb-bob" viewBox="0 0 12 18">
            <path d="M6 0 L11 7 Q12 9 10.5 11 L6 18 L1.5 11 Q0 9 1 7 Z" fill="rgb(var(--accent))" />
          </svg>
        </div>
        <div className="lp-hero-copy">
          <h1 id="lp-hero-title">Marque seu exame</h1>
          <p className="lp-lede">Comece de onde você está.</p>
          <p className="lp-body">
            Uma consulta por vídeo, com médico, para entender o que seu corpo está pedindo. Sem fila, sem sair de casa. A gente encontra
            você no seu momento e ajuda a dar o próximo passo, um de cada vez.
          </p>
          <p className="lp-facts">
            <span>Por vídeo</span>
            <span>Até {policy.consultMinutes} min</span>
            {price && <span>A partir de {formatBRL(price)}</span>}
            <span>Energia e disposição · Dieta · Treino · Suplementação</span>
          </p>
          <div className="lp-actions">
            <Link to="/comecar" className="lp-btn" onClick={() => track("comecar_click")}>
              Marcar agora <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/como-funciona" className="lp-ghost">
              Ver como funciona
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

type PanelKey = "consulta" | "suplemento" | "rotina";

interface Panel {
  key: PanelKey;
  chip: string;
  title: string;
  image: string;
  pos: string;
  glyph: ReactNode;
  items: string[];
  note: string;
  cta: string;
  /** Linha de cuidado já escolhida ao entrar no fluxo (vai por estado, não por URL). */
  motivo?: string;
}

const panels: Panel[] = [
  {
    key: "consulta",
    chip: "Consulta",
    title: "Marque sua consulta",
    image: "/img/painel-consulta.jpg",
    pos: "35% 60%",
    glyph: <path fill="currentColor" d="M16 4h8v12h12v8H24v12h-8V24H4v-8h12z" />,
    items: [
      `Vídeo de até ${policy.consultMinutes} minutos com médico`,
      `Escolha o horário nos próximos ${policy.bookingWindowDays} dias`,
      `Pague com Pix ou cartão em até ${policy.maxInstallments}x`,
      `Remarque grátis até ${policy.freeRescheduleHours} horas antes`,
    ],
    note: `A sala abre ${policy.joinOpensMinutesBefore} minutos antes do horário marcado.`,
    cta: "Escolher horário",
  },
  {
    key: "suplemento",
    chip: "Suplementação",
    title: "Seu suplemento feito sob medida para você",
    image: "/img/painel-suplemento.jpg",
    pos: "center 40%",
    glyph: <path fill="currentColor" fillRule="evenodd" d="M8 6h18l8 8v20H14l-8-8V6zm7 9v10h10V15z" />,
    items: [
      "O médico avalia sua rotina, seus sintomas e seus exames",
      "Se houver indicação, você recebe a receita de uma fórmula manipulada",
      "A receita é sua: leve à farmácia que preferir",
      "Ou peça na Farmashop, se for mais prático",
    ],
    note: "A prescrição depende da avaliação médica. A Prumo não vende fórmulas.",
    cta: "Marcar avaliação",
    motivo: "suplementacao",
  },
  {
    key: "rotina",
    chip: "Autocuidado",
    title: "Crie sua rotina de autocuidado com um profissional",
    image: "/img/painel-rotina.jpg",
    pos: "center 35%",
    glyph: (
      <>
        <path fill="currentColor" d="M20 4a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm0 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" />
        <circle cx="20" cy="20" r="3" fill="currentColor" />
      </>
    ),
    items: [
      "Um plano simples para energia, dieta, treino e sono",
      "Pequenos passos que cabem no seu dia",
      "Retorno para ajustar o que não funcionou",
      "Tudo registrado na sua área do paciente",
    ],
    note: "Começa com uma consulta. O retorno é marcado quando você quiser.",
    cta: "Começar minha rotina",
  },
];

export function LandingPanels() {
  const [open, setOpen] = useState<PanelKey | null>(null);
  const triggers = useRef<Partial<Record<PanelKey, HTMLButtonElement | null>>>({});
  const closeBtn = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const current = panels.find((p) => p.key === open) ?? null;

  const close = () => {
    const k = open;
    setOpen(null);
    if (k) triggers.current[k]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (p: Panel) => {
    track("comecar_click");
    setOpen(null);
    navigate("/comecar", p.motivo ? { state: { motivo: p.motivo } } : undefined);
  };

  return (
    <section className="lp-services" id="servicos" aria-labelledby="lp-servicos-title">
      <div className="lp-services-head">
        <h2 className="lp-brand" id="lp-servicos-title">
          <span className="sr-only">Prumo, saúde no eixo</span>
          <span className="lp-brand-art" aria-hidden>
            <span className="lp-mark lp-mark-full" />
            <span className="lp-brand-line" />
          </span>
        </h2>
      </div>
      <div className="lp-cards">
        {panels.map((p) => (
          <button
            key={p.key}
            type="button"
            ref={(el) => (triggers.current[p.key] = el)}
            className="lp-card"
            style={{ "--img": `url('${p.image}')`, "--pos": p.pos } as CSSProperties}
            onClick={() => setOpen(p.key)}
            aria-haspopup="dialog"
          >
            <span className="lp-chip">{p.chip}</span>
            <svg className="lp-glyph" viewBox="0 0 40 40" aria-hidden>
              {p.glyph}
            </svg>
            <span className="lp-card-title">{p.title}</span>
            <span className="lp-more">Saiba mais</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="lp-veil" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="lp-sheet" role="dialog" aria-modal="true" aria-labelledby="lp-sheet-title">
            <button ref={closeBtn} type="button" className="lp-close" onClick={close} aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <span className="lp-chip">{current.chip}</span>
            <h3 id="lp-sheet-title">{current.title}</h3>
            <ul>
              {current.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="lp-note">{current.note}</p>
            <button type="button" className="lp-sheet-cta" onClick={() => go(current)}>
              {current.cta} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
