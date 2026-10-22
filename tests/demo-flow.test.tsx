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

    const v = await api.getTriageVersion("energia-e-disposicao");
    const answers = { sexo: "M", urgencia: ["nenhum"], relato: "Queda há meses" };
    const triageId = await api.saveTriageDraft({ care_line: "energia-e-disposicao", version_id: v.id, answers });
    await api.submitTriage(triageId, answers, evaluate(triageV1("energia-e-disposicao"), answers).alerts);

    const slots = await api.listSlots("energia-e-disposicao", new Date().toISOString(), 14);
    expect(slots.length).toBeGreaterThan(0);

    // Sem autorização de dados de saúde não reserva
    await expect(
      api.reserveSlot({ professional_id: slots[0].professional_id, starts_at: slots[0].starts_at, care_line: "energia-e-disposicao", kind: "primeira", triage_response_id: triageId }),
    ).rejects.toThrow(/autorização/);

    await api.recordConsents(["termos", "privacidade", "dados_saude"]);
    const appt = await api.reserveSlot({
      professional_id: slots[0].professional_id,
      starts_at: slots[0].starts_at,
      care_line: "energia-e-disposicao",
      kind: "primeira",
      triage_response_id: triageId,
    });
    expect(appt.status).toBe("reservado");
    expect(appt.price_cents).toBe(9990);

    // O horário reservado some da lista
    const after = await api.listSlots("energia-e-disposicao", new Date().toISOString(), 14);
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
    const v = await api.getTriageVersion("dieta");
    const id = await api.saveTriageDraft({ care_line: "dieta", version_id: v.id, answers: {} });
    await api.submitTriage(id, {}, []);
    const [slot] = await api.listSlots("dieta", new Date().toISOString(), 14);
    await expect(api.reserveSlot({ ...slot, care_line: "dieta", kind: "primeira", triage_response_id: id })).rejects.toThrow(/18 anos/);
  });

  it("paciente não acessa o painel", async () => {
    const api = createDemoApi();
    await api.verifyCode("p@teste.com", DEMO_CODE);
    await expect(api.reportSummary(new Date().toISOString(), new Date().toISOString())).rejects.toThrow(/permissão/);
  });
});

describe("páginas públicas renderizam", () => {
  const routes = ["/", "/como-funciona", "/energia-e-disposicao", "/dieta", "/treino", "/suplementacao", "/preco", "/medicos", "/transparencia", "/o-que-nao-atendemos", "/perguntas", "/termos", "/privacidade", "/tcle", "/cancelamento", "/comecar"];
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
