import { useState, type FormEvent } from "react";
import { api, isDemo } from "@/lib/api";
import { isValidEmail } from "@/lib/cpf";
import { Button, Field, Input, Notice } from "./ui";
import { cn } from "@/lib/utils";

export type LoginAudience = "profissional" | "paciente";

/** Login e criação de conta com e-mail e senha. */
export function PasswordLogin({ audience, onDone }: { audience: LoginAudience; onDone: () => void }) {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isValidEmail(email)) return setError("Confira o e-mail.");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (mode === "criar" && password !== confirm) return setError("As senhas não são iguais.");
    setBusy(true);
    try {
      if (mode === "entrar") await api.signInWithPassword(email, password);
      else await api.signUpWithPassword(email, password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError(null);
    if (!isValidEmail(email)) return setError("Digite o seu e-mail acima e clique de novo em “Esqueci minha senha”.");
    try {
      await api.requestPasswordReset(email);
      setInfo("Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const tab = (m: "entrar" | "criar", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
      }}
      className={cn(
        "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
        mode === m ? "bg-primary text-primary-ink" : "text-muted hover:text-primary",
      )}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex gap-1 rounded-full border border-border p-1">
        {tab("entrar", "Entrar")}
        {tab("criar", "Criar conta")}
      </div>
      {isDemo && mode === "entrar" && (
        <Notice tone="info">Demonstração: os dados somem ao recarregar a página. Se for a primeira vez, use “Criar conta”.</Notice>
      )}
      <Field label="E-mail" htmlFor={`${audience}-email`}>
        <Input id={`${audience}-email`} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Senha" htmlFor={`${audience}-senha`} hint={mode === "criar" ? "Pelo menos 8 caracteres." : undefined}>
        <Input
          id={`${audience}-senha`}
          type="password"
          autoComplete={mode === "entrar" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {mode === "criar" && (
        <Field label="Repita a senha" htmlFor={`${audience}-senha2`}>
          <Input id={`${audience}-senha2`} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-success">{info}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {mode === "entrar" ? "Entrar" : "Criar conta"}
      </Button>
      {mode === "entrar" && (
        <button type="button" className="w-full text-sm text-muted underline" onClick={forgot}>
          Esqueci minha senha
        </button>
      )}
    </form>
  );
}
