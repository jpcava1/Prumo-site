import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createDemoApi, DEMO_CODE } from "@/lib/api/demoApi";
import { triageV1 } from "@/content/triage/v1";
import { evaluate } from "@/lib/triage/engine";
import { AuthProvider } from "@/context/AuthContext";
import App from "@/App";

/** Jornada completa no modo demonstração, pela mesma interface usada com o Supabase. */
describe("jornada do paciente (demonstração)", () => {
  it("cadastro → triagem → horário → pagamento → consulta → receita", async () => {
    const api = createDemoApi();
    await api.sendCode("paciente@teste.com");
    await expect(api.verifyCode("paciente@teste.com", "000000")).rejects.toThrow();
    await api.verifyCode("paciente@teste.com", DEMO_CODE);

    await api.saveProfile({ full_name: "Maria Teste", cpf: "529.982.247-25", birth_date: "1990-05-10", phone: "(43) 99999-0000" });

    const v = await api.getTriageVersion("cabelo");
    const answers = { sexo: "M", urgencia: ["nenhum"], relato: "Queda há meses" };
    const triageId = await api.saveTriageDraft({ care_line: "cabelo", version_id: v.id, answers });
    await api.submitTriage(triageId, answers, evaluate(triageV1("cabelo"), answers).alerts);

    const slots = await api.listSlots("cabelo", new Date().toISOString(), 14);
    expect(slots.length).toBeGreaterThan(0);

    // Sem autorização de dados de saúde não reserva
    await expect(
      api.reserveSlot({ professional_id: slots[0].professional_id, starts_at: slots[0].starts_at, care_line: "cabelo", kind: "primeira", triage_response_id: triageId }),
    ).rejects.toThrow(/autorização/);

    await api.recordConsents(["termos", "privacidade", "dados_saude"]);
    const appt = await api.reserveSlot({
      professional_id: slots[0].professional_id,
      starts_at: slots[0].starts_at,
      care_line: "cabelo",
      kind: "primeira",
      triage_response_id: triageId,
    });
    expect(appt.status).toBe("reservado");
    expect(appt.price_cents).toBe(9990);

    // O horário reservado some da lista
    const after = await api.listSlots("cabelo", new Date().toISOString(), 14);
    expect(after.some((s) => s.professional_id === slots[0].professional_id && s.starts_at === slots[0].starts_at)).toBe(false);

    const pay = await api.startPayment(appt.id);
    expect(pay.amount_cents).toBe(9990);
    await api.demoConfirmPayment!(appt.id);
    expect((await api.getAppointment(appt.id))?.status).toBe("confirmado");

    await api.demoCompleteConsultation!(appt.id, true);
    const docs = await api.listMyDocuments();
    expect(docs.map((d) => d.kind).sort()).toEqual(["orientacao", "plano", "receita"]);
  });

  it("bloqueia menor de 18 anos na reserva", async () => {
    const api = createDemoApi();
    await api.verifyCode("menor@teste.com", DEMO_CODE);
    await api.saveProfile({ full_name: "Joana Menor", cpf: "529.982.247-25", birth_date: "2012-01-01", phone: "43999990000" });
    await api.recordConsents(["dados_saude"]);
    const v = await api.getTriageVersion("pele");
    const id = await api.saveTriageDraft({ care_line: "pele", version_id: v.id, answers: {} });
    await api.submitTriage(id, {}, []);
    const [slot] = await api.listSlots("pele", new Date().toISOString(), 14);
    await expect(api.reserveSlot({ ...slot, care_line: "pele", kind: "primeira", triage_response_id: id })).rejects.toThrow(/18 anos/);
  });

  it("médico monta a receita na consulta e o paciente a recebe ao final, sem preço", async () => {
    const api = createDemoApi();
    await api.verifyCode("rx@teste.com", DEMO_CODE);
    await api.saveProfile({ full_name: "Paulo Receita", cpf: "529.982.247-25", birth_date: "1985-03-02", phone: "43999990000" });
    await api.recordConsents(["termos", "privacidade", "dados_saude"]);
    const v = await api.getTriageVersion("suplementacao");
    const t = await api.saveTriageDraft({ care_line: "suplementacao", version_id: v.id, answers: {} });
    await api.submitTriage(t, {}, []);
    const [slot] = (await api.listSlots("suplementacao", new Date().toISOString(), 14)).filter((s) => s.professional_id === "p1");
    const appt = await api.reserveSlot({ ...slot, care_line: "suplementacao", kind: "primeira", triage_response_id: t });
    await api.demoConfirmPayment!(appt.id);

    // paciente não acessa a tabela de ativos nem o rascunho
    await expect(api.doctorListActives()).rejects.toThrow(/permissão/);

    await api.demoSetRole!("doctor");
    const actives = await api.doctorListActives();
    expect(actives.length).toBeGreaterThan(0);
    const rx = { form: "Cápsulas", quantity: "60 cápsulas", directions: "1 ao dia", items: [{ name: actives[0].name, dose: actives[0].default_dose ?? "1 mg" }] };
    await api.doctorSavePrescriptionDraft(appt.id, rx);
    await expect(api.doctorFinishConsultation(appt.id, { outcome: "receita_emitida", returnDays: null, prescription: { ...rx, items: [] } })).rejects.toThrow(/componente/);
    const { document_id } = await api.doctorFinishConsultation(appt.id, { outcome: "receita_emitida", returnDays: 60, prescription: rx });
    expect(document_id).toBeTruthy();
    await expect(api.doctorSavePrescriptionDraft(appt.id, rx)).rejects.toThrow(/já foi emitida/);

    await api.demoSetRole!("patient");
    expect((await api.getAppointment(appt.id))?.status).toBe("realizado");
    const mine = await api.getPrescriptionForDocument(document_id!);
    expect(mine?.items).toEqual(rx.items);
    expect(JSON.stringify(mine)).not.toMatch(/price|preco|valor/i);
  });

  it("Seu Plano: biblioteca do profissional, emissão separada da receita, PDF e e-mail", async () => {
    const api = createDemoApi();
    await api.signUpWithPassword("pac3@teste.com", "senha-forte-1");
    await api.saveProfile({ full_name: "Paulo Plano", cpf: "529.982.247-25", birth_date: "1988-02-02", phone: "43999990000" });
    await api.recordConsents(["termos", "privacidade", "dados_saude"]);
    const v = await api.getTriageVersion("suplementacao");
    const t = await api.saveTriageDraft({ care_line: "suplementacao", version_id: v.id, answers: {} });
    await api.submitTriage(t, {}, []);
    const [slot] = (await api.listSlots("suplementacao", new Date().toISOString(), 14)).filter((s) => s.professional_id === "p1");
    const appt = await api.reserveSlot({ ...slot, care_line: "suplementacao", kind: "primeira", triage_response_id: t });
    await api.demoConfirmPayment!(appt.id);

    // paciente não mexe na biblioteca de ninguém
    await expect(api.doctorListTemplates()).rejects.toThrow(/permissão/);

    await api.demoSetRole!("doctor");
    const saved = await api.doctorSaveTemplate({ section: "cafe", title: "Iogurte com fruta", detail: "1 pote" });
    expect((await api.doctorListTemplates()).map((x) => x.id)).toEqual([saved.id]);

    const plan = [
      { section: "objetivo" as const, title: "Mais energia" },
      { section: "cafe" as const, title: saved.title, detail: saved.detail },
      { section: "rotina" as const, title: "Dormir 8 horas" },
      { section: "exame" as const, title: "Hemograma completo" },
      { section: "meta" as const, title: "   " }, // linha vazia é descartada
    ];
    await api.doctorSavePlanDraft(appt.id, plan);
    expect((await api.doctorGetPlanDraft(appt.id))?.items).toHaveLength(5);
    const rx = { form: "Cápsulas", quantity: "60", directions: "1 ao dia", items: [{ name: "Componente A", dose: "10 mg" }] };
    const res = await api.doctorFinishConsultation(appt.id, { outcome: "receita_emitida", returnDays: null, prescription: rx, plan });
    expect(res.document_id).toBeTruthy();
    expect(res.plan_document_id).toBeTruthy();
    expect(res.plan_document_id).not.toBe(res.document_id);
    await expect(api.doctorSavePlanDraft(appt.id, plan)).rejects.toThrow(/já foi enviado/);
    expect(await api.doctorSendDocuments(appt.id)).toEqual({ sent_to: "pac3@teste.com" });

    await api.demoSetRole!("patient");
    const docs = await api.listMyDocuments();
    expect(docs.map((d) => d.kind).sort()).toEqual(["orientacao", "plano", "receita"]);
    const planCtx = await api.getDocumentContext(res.plan_document_id!);
    expect(planCtx?.plan?.items.map((i) => i.title)).toEqual(["Mais energia", "Iogurte com fruta", "Dormir 8 horas", "Hemograma completo"]);
    expect(planCtx?.prescription).toBeNull();
    expect(JSON.stringify(planCtx?.plan)).not.toContain("Componente A");
    const rxCtx = await api.getDocumentContext(res.document_id!);
    expect(rxCtx?.prescription?.items[0].name).toBe("Componente A");
    expect(rxCtx?.patient.full_name).toBe("Paulo Plano");

    const { buildDocumentPdf } = await import("@/lib/pdf");
    expect(buildDocumentPdf(planCtx!)?.filename).toMatch(/^seu-plano-prumo-paulo-/);
    expect(buildDocumentPdf(rxCtx!)?.filename).toMatch(/^receita-prumo-paulo-/);
  });

  it("login com e-mail e senha", async () => {
    const api = createDemoApi();
    await expect(api.signInWithPassword("nova@teste.com", "12345678")).rejects.toThrow(/incorretos/);
    await expect(api.signUpWithPassword("nova@teste.com", "curta")).rejects.toThrow(/8 caracteres/);
    const u = await api.signUpWithPassword("nova@teste.com", "senha-forte-1");
    await api.signOut();
    await expect(api.signInWithPassword("nova@teste.com", "errada-123")).rejects.toThrow(/incorretos/);
    expect((await api.signInWithPassword("NOVA@teste.com", "senha-forte-1")).id).toBe(u.id);
    await expect(api.signUpWithPassword("nova@teste.com", "outra-senha-1")).rejects.toThrow(/Já existe/);
  });

  it("nutricionista se cadastra, abre horários e o paciente agenda com ela depois da aprovação", async () => {
    const api = createDemoApi();
    // profissional
    await api.signUpWithPassword("nutri@teste.com", "senha-forte-1");
    expect(await api.getMyProfessional()).toBeNull();
    await expect(
      api.registerProfessional({ kind: "nutricionista", full_name: "Ana Nutri", council_number: "1234", council_uf: "PR", graduation_institution: "UEL", graduation_year: 2025, specialty: "Esportiva", rqe: null, bio: null, phone: "43999990000" }),
    ).rejects.toThrow(/RQE/);
    const prof = await api.registerProfessional({ kind: "nutricionista", full_name: "Ana Nutri", council_number: "1234", council_uf: "PR", graduation_institution: "UEL", graduation_year: 2025, specialty: null, rqe: null, bio: null, phone: "43999990000" });
    expect(prof).toMatchObject({ council: "CRN", approval: "pendente", active: false, care_lines: ["suplementacao"] });

    // abre 08:00–10:00 depois de amanhã (4 horários de 30 min)
    const d = new Date(Date.now() + 2 * 86400_000);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
    await api.mySaveDayAvailability(day, [{ start_time: "08:00", end_time: "10:00" }]);
    expect(await api.myListDateAvailability(day, 1)).toHaveLength(1);
    const mine = async (line: string) => (await api.listSlots(line, new Date().toISOString(), 14)).filter((s) => s.professional_id === prof.id);

    // pendente: o paciente ainda não vê
    expect(await mine("suplementacao")).toHaveLength(0);
    await api.demoApproveMyProfessional!();
    const slots = await mine("suplementacao");
    expect(slots.map((s) => s.starts_at.slice(11, 16))).toEqual(["08:00", "08:30", "09:00", "09:30"]);
    expect(slots.every((s) => s.starts_at.startsWith(day))).toBe(true);
    // nutricionista não atende linhas que exigem médico
    expect(await mine("cabelo")).toHaveLength(0);
    expect((await api.listProfessionals()).some((p) => p.id === prof.id)).toBe(true);

    // paciente agenda o primeiro horário
    await api.signOut();
    await api.signUpWithPassword("paciente2@teste.com", "senha-forte-1");
    await api.saveProfile({ full_name: "Paula Paciente", cpf: "529.982.247-25", birth_date: "1990-01-01", phone: "43988887777" });
    await api.recordConsents(["termos", "privacidade", "dados_saude"]);
    const v = await api.getTriageVersion("suplementacao");
    const t = await api.saveTriageDraft({ care_line: "suplementacao", version_id: v.id, answers: {} });
    await api.submitTriage(t, {}, []);
    const appt = await api.reserveSlot({ professional_id: prof.id, starts_at: slots[0].starts_at, care_line: "suplementacao", kind: "primeira", triage_response_id: t });
    await api.demoConfirmPayment!(appt.id);
    expect((await api.listSlots("suplementacao", new Date().toISOString(), 14)).some((s) => s.professional_id === prof.id && s.starts_at === slots[0].starts_at)).toBe(false);

    // a profissional vê a consulta na agenda dela
    await api.signOut();
    await api.signInWithPassword("nutri@teste.com", "senha-forte-1");
    const agenda = await api.doctorAgenda();
    expect(agenda.map((a) => a.id)).toEqual([appt.id]);

    // fechar o dia remove os horários livres, mas não a consulta marcada
    await api.mySaveDayAvailability(day, []);
    expect(await mine("suplementacao")).toHaveLength(0);
    expect((await api.doctorAgenda()).map((a) => a.id)).toEqual([appt.id]);
  });

  it("paciente não acessa o painel", async () => {
    const api = createDemoApi();
    await api.verifyCode("p@teste.com", DEMO_CODE);
    await expect(api.reportSummary(new Date().toISOString(), new Date().toISOString())).rejects.toThrow(/permissão/);
  });
});

describe("páginas públicas renderizam", () => {
  const routes = ["/", "/como-funciona", "/cabelo", "/pele", "/sono-e-energia", "/suplementacao", "/preco", "/medicos", "/transparencia", "/o-que-nao-atendemos", "/perguntas", "/termos", "/privacidade", "/tcle", "/cancelamento", "/comecar"];
  it.each(routes)("%s", async (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findAllByRole("heading", { level: 1 })).not.toHaveLength(0);
  });
});
