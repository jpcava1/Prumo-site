import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input, Notice, Section, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, type ProfessionalSignup as SignupInput } from "@/lib/api";
import { formatPhone, isValidPhone } from "@/lib/cpf";
import { cn } from "@/lib/utils";

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const thisYear = new Date().getFullYear();

/** Questionário rápido de cadastro do médico, nutricionista ou personal trainer. */
export default function ProfessionalSignup() {
  const navigate = useNavigate();
  const { user, professional, refreshProfile } = useAuth();
  const [kind, setKind] = useState<SignupInput["kind"]>("medico");
  const [fullName, setFullName] = useState("");
  const [council, setCouncil] = useState("");
  const [uf, setUf] = useState("PR");
  const [institution, setInstitution] = useState("");
  const [year, setYear] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [rqe, setRqe] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/entrar" replace />;
  if (professional) return <Navigate to="/painel/horarios" replace />;

  const councilLabel = kind === "medico" ? "CRM" : kind === "nutricionista" ? "CRN" : "CREF";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (fullName.trim().split(/\s+/).length < 2) errs.fullName = "Informe nome e sobrenome.";
    if (!/^\d{2,8}$/.test(council.replace(/\D/g, ""))) errs.council = `Informe o número do ${councilLabel}.`;
    if (institution.trim().length < 3) errs.institution = "Informe onde você se formou.";
    const y = Number(year);
    if (!y || y < 1960 || y > thisYear) errs.year = "Informe o ano de formatura.";
    if (specialty.trim() && !rqe.trim()) errs.rqe = "Especialidade só com RQE. Deixe em branco se não tiver.";
    if (!isValidPhone(phone)) errs.phone = "Informe o celular com DDD.";
    if (!agree) errs.agree = "Para continuar, aceite as condições.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.registerProfessional({
        kind,
        full_name: fullName,
        council_number: council.replace(/\D/g, ""),
        council_uf: uf,
        graduation_institution: institution,
        graduation_year: y,
        specialty: specialty.trim() || null,
        rqe: rqe.trim() || null,
        bio: bio.trim() || null,
        phone,
      });
      await refreshProfile();
      navigate("/painel/horarios", { replace: true });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const kindBtn = (k: SignupInput["kind"], label: string) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      aria-pressed={kind === k}
      className={cn(
        "flex-1 rounded-card border px-4 py-4 text-left transition-colors",
        kind === k ? "border-primary bg-primary-soft/60" : "border-border hover:border-primary",
      )}
    >
      <span className="block font-semibold">{label}</span>
      <span className="block text-sm text-muted">{k === "medico" ? "CRM · todas as linhas" : "CRN · linha de suplementação"}</span>
    </button>
  );

  return (
    <Section>
      <form onSubmit={submit} noValidate className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Seja profissional Prumo</p>
        <h1 className="mt-2 text-3xl font-semibold">Seu cadastro</h1>
        <p className="mt-2 text-muted">Leva 2 minutos. A Prumo confere o seu registro no conselho antes de liberar a sua agenda para os pacientes.</p>

        <Card className="mt-8 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Você é</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {kindBtn("medico", "Médico(a)")}
              {kindBtn("nutricionista", "Nutricionista")}
              {kindBtn("educador_fisico", "Personal trainer")}
            </div>
          </div>

          <Field label="Nome completo" htmlFor="pf-name" error={errors.fullName}>
            <Input id="pf-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label={`Número do ${councilLabel}`} htmlFor="pf-council" error={errors.council}>
              <Input id="pf-council" inputMode="numeric" value={council} onChange={(e) => setCouncil(e.target.value)} />
            </Field>
            <Field label="UF" htmlFor="pf-uf">
              <select id="pf-uf" value={uf} onChange={(e) => setUf(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface px-3">
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label="Onde se formou" htmlFor="pf-inst" error={errors.institution}>
              <Input id="pf-inst" placeholder="ex.: Universidade Estadual de Londrina" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            </Field>
            <Field label="Ano de formatura" htmlFor="pf-year" error={errors.year}>
              <Input id="pf-year" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Especialidade (opcional)" htmlFor="pf-spec" hint="Só com RQE.">
              <Input id="pf-spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
            </Field>
            <Field label="RQE (opcional)" htmlFor="pf-rqe" error={errors.rqe}>
              <Input id="pf-rqe" value={rqe} onChange={(e) => setRqe(e.target.value)} />
            </Field>
          </div>

          <Field label="Celular com DDD" htmlFor="pf-phone" error={errors.phone} hint="Só para a equipe da Prumo falar com você.">
            <Input id="pf-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(43) 90000-0000" />
          </Field>

          <Field label="Apresentação curta (opcional)" htmlFor="pf-bio" hint="Aparece para o paciente na hora de escolher o horário.">
            <Textarea id="pf-bio" maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>

          <label className="flex items-start gap-3">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
            <span className="text-[15px]">
              Entendo que recebo um valor fixo por consulta realizada, com ou sem receita, que prescrevo sem indicar marca nem farmácia e que preciso de
              certificado digital ICP-Brasil para assinar receitas.
            </span>
          </label>
          {errors.agree && <p className="text-sm text-danger">{errors.agree}</p>}
          {errors.form && <Notice tone="danger">{errors.form}</Notice>}

          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Enviar cadastro
          </Button>
        </Card>
      </form>
    </Section>
  );
}
