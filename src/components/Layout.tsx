import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { company } from "@/config/site";
import { isDemo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookieConsent, setCookieConsent, isPrivatePath } from "@/lib/analytics";
import { buttonClass, Container } from "./ui";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 no-underline", className)} aria-label="Prumo — página inicial">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="rgb(var(--primary))" />
        <line x1="16" y1="6" x2="16" y2="20" stroke="rgb(var(--primary-ink))" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 20h8l-4 6z" fill="rgb(var(--accent))" />
      </svg>
      <span className="font-display text-xl font-semibold text-ink">Prumo</span>
    </Link>
  );
}

const nav = [
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/preco", label: "Preço" },
  { to: "/medicos", label: "Médicos" },
  { to: "/transparencia", label: "Transparência" },
  { to: "/perguntas", label: "Perguntas" },
];

function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn("text-[15px] no-underline hover:text-primary", isActive ? "text-primary" : "text-ink/80")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to={user ? "/minha-conta" : "/entrar"} className="text-[15px] text-ink/80 no-underline hover:text-primary">
            {user ? "Minha conta" : "Entrar"}
          </Link>
          <Link to="/comecar" className={buttonClass("primary", "sm")}>
            Começar
          </Link>
        </div>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>
      {open && (
        <nav className="border-t border-border bg-bg md:hidden" aria-label="Menu móvel">
          <Container className="flex flex-col gap-1 py-3">
            {[...nav, { to: user ? "/minha-conta" : "/entrar", label: user ? "Minha conta" : "Entrar" }].map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-2 py-3 text-ink no-underline hover:bg-primary-soft">
                {n.label}
              </Link>
            ))}
          </Container>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Consulta online com médico identificado. Se houver indicação, a receita é sua e você escolhe a farmácia.
          </p>
          <p className="text-sm text-muted">
            Em caso de urgência, ligue <strong className="text-ink">192 (SAMU)</strong>.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Atendimento</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/como-funciona" className="text-muted hover:text-primary">Como funciona</Link></li>
            <li><Link to="/o-que-nao-atendemos" className="text-muted hover:text-primary">O que não atendemos</Link></li>
            <li><Link to="/conteudo" className="text-muted hover:text-primary">Conteúdo</Link></li>
            <li><Link to="/perguntas" className="text-muted hover:text-primary">Perguntas frequentes</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/termos" className="text-muted hover:text-primary">Termos de uso</Link></li>
            <li><Link to="/privacidade" className="text-muted hover:text-primary">Privacidade</Link></li>
            <li><Link to="/tcle" className="text-muted hover:text-primary">Consentimento da telemedicina</Link></li>
            <li><Link to="/cancelamento" className="text-muted hover:text-primary">Cancelamento e reembolso</Link></li>
            <li><Link to="/transparencia" className="text-muted hover:text-primary">Transparência</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="space-y-1 py-6 text-xs leading-relaxed text-muted">
          <p>
            {company.legalName} · CNPJ {company.cnpj} · {company.crmRegistration}
          </p>
          <p>
            Diretor técnico: {company.technicalDirector.name}, {company.technicalDirector.crm} · Encarregado de dados: {company.dpo.name} ({company.dpo.email})
          </p>
          <p>{company.address}</p>
        </Container>
      </div>
    </footer>
  );
}

function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div className="bg-accent/15 px-4 py-2 text-center text-sm text-ink">
      <strong>Modo demonstração:</strong> dados fictícios em memória, nada é salvo. Código de login: <strong>123456</strong>.
    </div>
  );
}

/** Banner de cookies com "Recusar" do mesmo tamanho de "Aceitar" (LGPD). Não aparece nas áreas privadas. */
function CookieBanner() {
  const { pathname } = useLocation();
  const [decided, setDecided] = useState<boolean>(() => getCookieConsent() !== null);
  if (decided || isPrivatePath(pathname)) return null;
  const choose = (v: boolean) => {
    setCookieConsent(v);
    setDecided(true);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-lg" role="dialog" aria-label="Cookies">
      <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/90">
          Usamos cookies para entender o uso das páginas públicas. Nada da sua saúde é compartilhado. <Link to="/privacidade">Saiba mais</Link>.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:w-[280px]">
          <button className={buttonClass("secondary", "sm")} onClick={() => choose(false)}>
            Recusar
          </button>
          <button className={buttonClass("secondary", "sm")} onClick={() => choose(true)}>
            Aceitar
          </button>
        </div>
      </Container>
    </div>
  );
}

/** Botão "Começar" fixo no rodapé no celular, só nas páginas públicas. */
function StickyStart() {
  const { pathname } = useLocation();
  if (isPrivatePath(pathname) || pathname.startsWith("/termos") || pathname.startsWith("/privacidade")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 p-3 backdrop-blur md:hidden">
      <Link to="/comecar" className={buttonClass("primary", "lg", "w-full")}>
        Começar
      </Link>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function SiteLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <DemoBanner />
      <Header />
      <main className="flex-1 pb-24 md:pb-0">{children ?? <Outlet />}</main>
      <Footer />
      <StickyStart />
      <CookieBanner />
    </div>
  );
}
