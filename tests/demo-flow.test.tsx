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
    expect(docs.map((d) => d.kind).sort()).toEqual(["orientacao", "receita"]);
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
