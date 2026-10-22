import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* Botões ------------------------------------------------------------------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none no-underline";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-accent-deep",
  secondary: "bg-surface text-ink border border-border hover:border-primary hover:text-primary",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-surface text-danger border border-danger/40 hover:bg-danger/5",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* Layout ----------------------------------------------------------------------- */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-site px-4 sm:px-6", className)}>{children}</div>;
}

export function Section({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("py-14 sm:py-20", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{children}</p>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card border border-border bg-surface p-5 sm:p-6", className)}>{children}</div>;
}

/* Formulário ------------------------------------------------------------------- */
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-border bg-surface px-4 text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-12", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-[120px] py-3", className)} {...rest} />;
});

export function Checkbox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/60">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-[15px] leading-snug">{children}</span>
    </label>
  );
}

/** Cartão de opção (rádio ou caixa de seleção) com área de toque grande. */
export function ChoiceOption({
  name,
  type,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  type: "radio" | "checkbox";
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-colors",
        checked ? "border-primary bg-primary-soft/60" : "border-border hover:border-primary/60",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}

/* Avisos ------------------------------------------------------------------------- */
export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-primary/30 bg-primary-soft/50",
    warning: "border-accent/30 bg-cream",
    danger: "border-danger/40 bg-danger/5",
    success: "border-success/40 bg-success/10",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  return (
    <div className={cn("flex gap-3 rounded-card border p-4", styles)} role={tone === "danger" ? "alert" : "status"}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary")} aria-hidden />
      <div className="space-y-1 text-[15px]">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-ink/90">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "warning" | "danger" | "success" }) {
  const t = {
    neutral: "bg-border/60 text-ink",
    primary: "bg-primary-soft text-primary",
    warning: "bg-cream text-ink",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progresso"}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Spinner({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="text-3xl font-semibold leading-tight sm:text-[2.6rem]">{title}</h1>
      {children && <div className="mt-4 text-lg text-muted">{children}</div>}
    </div>
  );
}
