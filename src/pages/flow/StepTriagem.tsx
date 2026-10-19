import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { QuestionInput } from "@/components/QuestionInput";
import { isProfileComplete, useAuth } from "@/context/AuthContext";
import { useFlow } from "@/context/FlowContext";
import { api, type TriageVersion } from "@/lib/api";
import type { AnswerValue, Answers } from "@/lib/triage/schema";
import { evaluate, isAdult, isAnswered, pruneAnswers, validateAnswer, visibleQuestions } from "@/lib/triage/engine";
import { track } from "@/lib/analytics";

/**
 * Triagem: anamnese para o médico. Uma pergunta por tela, rascunho salvo a cada resposta.
 * NÃO mostra resultado, pontuação, sugestão de tratamento ou de produto.
 * Só para o fluxo em caso de emergência (e mostra SAMU 192).
 */
export default function StepTriagem() {
  const navigate = useNavigate();
  const flow = useFlow();
  const { profile, loading: authLoading } = useAuth();

  const [version, setVersion] = useState<TriageVersion | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [responseId, setResponseId] = useState<string | null>(flow.triageResponseId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    track("fluxo_etapa_triagem");
  }, []);

  useEffect(() => {
    if (!flow.careLine) return;
    api
      .getTriageVersion(flow.careLine)
      .then(setVersion)
      .catch((e) => setError((e as Error).message));
  }, [flow.careLine]);

  const visible = useMemo(() => (version ? visibleQuestions(version.definition, answers) : []), [version, answers]);
  const evaluation = useMemo(() => (version ? evaluate(version.definition, answers) : null), [version, answers]);

  if (!flow.careLine) return <Navigate to="/comecar" replace />;
  if (authLoading) return <Spinner />;
  if (!isProfileComplete(profile)) return <Navigate to="/comecar/conta" replace />;
  if (profile?.birth_date && !isAdult(profile.birth_date)) return <Navigate to="/comecar/conta" replace />;
  if (error && !version) return <Notice tone="danger">{error}</Notice>;
  if (!version) return <Spinner label="Carregando a triagem" />;

  // Bloqueio por emergência: para tudo.
  if (evaluation?.blocked) {
    return (
      <Card className="border-danger/50">
        <h1 className="text-2xl font-semibold text-danger">Procure atendimento de urgência agora.</h1>
        <p className="mt-3 text-ink/90">
          Os sinais que você marcou precisam de avaliação presencial imediata. Não espere a consulta online.
        </p>
        <a href="tel:192" className="mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-danger px-7 font-semibold text-white no-underline">
          <Phone className="h-5 w-5" aria-hidden /> Ligar 192 (SAMU)
        </a>
        <p className="mt-6 text-sm text-muted">
          Se marcou por engano,{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => {
              setAnswers((a) => ({ ...a, urgencia: null }));
              setIndex(visible.findIndex((q) => q.id === "urgencia"));
            }}
          >
            volte e corrija a resposta
          </button>
          .
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <h1 className="text-3xl font-semibold">Pronto.</h1>
        <p className="mt-3 text-lg text-muted">Suas respostas vão para o médico antes da consulta.</p>
        {evaluation?.support.includes("cvv") && (
          <div className="mt-6">
            <Notice tone="info" title="Você não está sozinho">
              Se precisar conversar agora, o CVV atende 24 horas, de graça, pelo 188 ou em cvv.org.br. Em caso de urgência, ligue 192.
            </Notice>
          </div>
        )}
        <Button size="lg" className="mt-8 w-full" onClick={() => navigate("/comecar/agenda")}>
          Escolher horário
        </Button>
      </Card>
    );
  }

  const safeIndex = Math.min(index, Math.max(visible.length - 1, 0));
  const q = visible[safeIndex];
  const value = answers[q.id];
  const isLast = safeIndex === visible.length - 1;
  const showCvv = q.support && evaluation?.support.includes(q.support.kind);

  async function ensureDraft(next: Answers): Promise<string> {
    const id = await api.saveTriageDraft({ id: responseId ?? undefined, care_line: flow.careLine!, version_id: version!.id, answers: next });
    if (!responseId) {
      setResponseId(id);
      flow.setTriageResponseId(id);
    }
    return id;
  }

  async function next() {
    const msg = validateAnswer(q, value);
    if (msg) return setError(msg);
    setError(null);
    setBusy(true);
    try {
      const pruned = pruneAnswers(version!.definition, answers);
      const id = await ensureDraft(pruned);
      if (isLast) {
        const ev = evaluate(version!.definition, pruned);
        if (ev.blocked) return; // a tela de emergência aparece no próximo render
        await api.submitTriage(id, pruned, ev.alerts);
        setDone(true);
      } else {
        setIndex(safeIndex + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (v: AnswerValue) => {
    setError(null);
    setAnswers((a) => ({ ...a, [q.id]: v }));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between text-sm text-muted">
        <span>
          Pergunta {safeIndex + 1} de {visible.length}
        </span>
        {safeIndex === 0 && version.definition.intro && <span className="hidden sm:inline">{version.definition.intro}</span>}
      </div>

      <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{q.label}</h1>
      {q.help && <p className="mt-2 text-muted">{q.help}</p>}

      <div className="mt-6">
        <QuestionInput q={q} value={value} onChange={set} onUpload={async (file) => api.uploadTriageFile(await ensureDraft(answers), file)} />
      </div>

      {showCvv && (
        <div className="mt-6">
          <Notice tone="info" title="Obrigado por contar">
            Vamos avisar o médico. Se precisar conversar agora, o CVV atende 24 horas pelo 188 ou em cvv.org.br. Você pode continuar o agendamento.
          </Notice>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}

      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => (safeIndex === 0 ? navigate("/comecar") : setIndex(safeIndex - 1))}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button size="lg" className="flex-1" onClick={next} loading={busy}>
          {isLast ? "Enviar para o médico" : !q.required && !isAnswered(q, value) ? "Pular" : "Continuar"}
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted">
        Suas respostas ficam guardadas com segurança e só o médico da sua consulta vê. <Link to="/privacidade">Privacidade</Link>.
      </p>
    </div>
  );
}
