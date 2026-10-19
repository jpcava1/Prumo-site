import { useState, type FormEvent } from "react";
import { api, isDemo } from "@/lib/api";
import { isValidEmail } from "@/lib/cpf";
import { Button, Field, Input, Notice } from "./ui";
import { DEMO_CODE } from "@/lib/api/demoApi";

/** Login sem senha: código de 6 dígitos por e-mail. */
export function EmailCodeLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError("Confira o e-mail.");
    setBusy(true);
    try {
      await api.sendCode(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyCode(email, code);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <form onSubmit={send} className="space-y-4">
        <Field label="Seu e-mail" htmlFor="email" error={error} hint="Enviamos um código de 6 dígitos. Sem senha.">
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Receber código
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {isDemo && <Notice tone="info">Modo demonstração: use o código {DEMO_CODE}.</Notice>}
      <Field label={`Código enviado para ${email}`} htmlFor="code" error={error}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          className="text-center text-2xl tracking-[0.5em]"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
        Entrar
      </Button>
      <button type="button" className="w-full text-sm text-primary underline" onClick={() => setSent(false)}>
        Usar outro e-mail
      </button>
    </form>
  );
}
