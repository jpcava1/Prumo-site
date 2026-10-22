import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Stethoscope, User, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PasswordLogin, type LoginAudience } from "./PasswordLogin";

/**
 * Escolha do tipo de acesso (profissional ou paciente) e depois e-mail e senha.
 * Usado no pop-up do "Login" do topo e na página /entrar.
 */
export function LoginChooser({ onDone, patientRedirect = "/minha-conta" }: { onDone?: () => void; patientRedirect?: string }) {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [audience, setAudience] = useState<LoginAudience | null>(null);

  async function done() {
    await refreshProfile();
    onDone?.();
    if (audience === "profissional") {
      const prof = await api.getMyProfessional().catch(() => null);
      navigate(prof ? "/painel/horarios" : "/profissional/cadastro", { replace: true });
    } else {
      navigate(patientRedirect, { replace: true });
    }
  }

  if (!audience) {
    return (
      <div className="space-y-3">
        <button type="button" data-testid="login-profissional" onClick={() => setAudience("profissional")} className={OPTION}>
          <Stethoscope className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
          <span className="text-left">
            <span className="block text-lg font-semibold">Profissional</span>
            <span className="block text-sm text-muted">Médico, nutricionista ou personal trainer</span>
          </span>
        </button>
        <button type="button" data-testid="login-paciente" onClick={() => setAudience("paciente")} className={OPTION}>
          <User className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
          <span className="text-left">
            <span className="block text-lg font-semibold">Paciente</span>
            <span className="block text-sm text-muted">Consultas, documentos e pagamentos</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setAudience(null)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {audience === "profissional" ? "Profissional" : "Paciente"}
      </button>
      <PasswordLogin audience={audience} onDone={done} />
    </div>
  );
}

const OPTION =
  "flex w-full items-center gap-4 rounded-card border border-border bg-surface px-5 py-5 transition-colors hover:border-primary focus-visible:border-primary";

/** Pop-up de login aberto pelo link "Login" do topo do site. */
export function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("button[data-testid]")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portal no <body>: o cabeçalho tem backdrop-blur, que prenderia um elemento fixed dentro dele.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-16 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-md rounded-[20px] border border-border bg-surface p-6 shadow-2xl sm:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-primary" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <h2 id="login-title" className="text-2xl font-semibold">
          Login
        </h2>
        <p className="mb-6 mt-1 text-sm text-muted">Como você quer entrar?</p>
        <LoginChooser onDone={onClose} />
      </div>
    </div>,
    document.body,
  );
}
