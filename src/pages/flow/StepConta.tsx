import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Card, Checkbox, Field, Input, Notice, Spinner } from "@/components/ui";
import { EmailCodeLogin } from "@/components/EmailCodeLogin";
import { useAuth } from "@/context/AuthContext";
import { useFlow } from "@/context/FlowContext";
import { api } from "@/lib/api";
import { formatCPF, formatPhone, isValidCPF, isValidPhone } from "@/lib/cpf";
import { isAdult } from "@/lib/triage/engine";
import { track } from "@/lib/analytics";

export default function StepConta() {
  const navigate = useNavigate();
  const flow = useFlow();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [termos, setTermos] = useState(false);
  const [privacidade, setPrivacidade] = useState(false);
  const [saude, setSaude] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [minor, setMinor] = useState(false);

  useEffect(() => {
    track("fluxo_etapa_conta");
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setCpf(profile.cpf ? formatCPF(profile.cpf) : "");
      setBirth(profile.birth_date ?? "");
      setPhone(profile.phone ? formatPhone(profile.phone) : "");
    }
  }, [profile]);

  if (!flow.careLine) return <Navigate to="/comecar" replace />;
  if (loading) return <Spinner />;

  if (minor) {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">Atendemos apenas maiores de 18 anos.</h1>
        <p className="mt-3 text-muted">
          Para menores de idade, procure um pediatra ou um serviço presencial com o seu responsável. Em caso de urgência, ligue 192.
        </p>
        <Link to="/" className="mt-6 inline-block">
          Voltar para o início
        </Link>
      </Card>
    );
  }

  if (!user) {
    return (
      <div>
        <h1 className="text-3xl font-semibold">Crie sua conta ou entre</h1>
        <p className="mt-2 text-muted">É por ela que você acessa a consulta e os documentos.</p>
        <Card className="mt-8">
          <EmailCodeLogin onDone={() => refreshProfile()} />
        </Card>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (fullName.trim().split(/\s+/).length < 2) errs.fullName = "Informe nome e sobrenome.";
    if (!isValidCPF(cpf)) errs.cpf = "CPF inválido.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) errs.birth = "Informe a data de nascimento.";
    if (!isValidPhone(phone)) errs.phone = "Informe o celular com DDD.";
    if (!termos || !privacidade || !saude) errs.consents = "Para continuar, aceite os três itens obrigatórios.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isAdult(birth)) {
      setMinor(true);
      return;
    }

    setBusy(true);
    try {
      await api.saveProfile({ full_name: fullName, cpf, birth_date: birth, phone });
      await api.recordConsents(["termos", "privacidade", "dados_saude", ...(marketing ? (["marketing"] as const) : [])]);
      await refreshProfile();
      navigate("/comecar/triagem");
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl font-semibold">Seus dados</h1>
      <p className="mt-2 text-muted">A receita médica exige nome completo, CPF e data de nascimento.</p>

      <div className="mt-8 space-y-5">
        <Field label="Nome completo" htmlFor="name" error={errors.fullName}>
          <Input id="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="CPF" htmlFor="cpf" error={errors.cpf}>
            <Input id="cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
          </Field>
          <Field label="Data de nascimento" htmlFor="birth" error={errors.birth}>
            <Input id="birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
        <Field label="Celular com DDD" htmlFor="phone" error={errors.phone} hint="Para avisos da consulta. Nunca citamos o motivo.">
          <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(43) 90000-0000" />
        </Field>
      </div>

      <div className="mt-8 space-y-3">
        <p className="text-sm font-medium">Autorizações</p>
        <Checkbox id="c-termos" checked={termos} onChange={setTermos}>
          Li e aceito os{" "}
          <Link to="/termos" target="_blank">
            Termos de uso
          </Link>
          . <span className="text-muted">(obrigatório)</span>
        </Checkbox>
        <Checkbox id="c-priv" checked={privacidade} onChange={setPrivacidade}>
          Li e aceito a{" "}
          <Link to="/privacidade" target="_blank">
            Política de privacidade
          </Link>
          . <span className="text-muted">(obrigatório)</span>
        </Checkbox>
        <Checkbox id="c-saude" checked={saude} onChange={setSaude}>
          Autorizo o uso dos meus dados de saúde para o meu atendimento. <span className="text-muted">(obrigatório)</span>
        </Checkbox>
        <Checkbox id="c-mkt" checked={marketing} onChange={setMarketing}>
          Quero receber conteúdos da Prumo por e-mail. <span className="text-muted">(opcional)</span>
        </Checkbox>
        {errors.consents && <p className="text-sm text-danger">{errors.consents}</p>}
      </div>

      {errors.form && (
        <div className="mt-6">
          <Notice tone="danger">{errors.form}</Notice>
        </div>
      )}

      <Button type="submit" size="lg" className="mt-8 w-full" loading={busy}>
        Continuar
      </Button>
    </form>
  );
}
