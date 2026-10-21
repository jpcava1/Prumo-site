import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "@/components/Layout";
import { RequireAuth, RequireProfessional, RequireRole } from "@/components/Guards";
import { FlowProvider } from "@/context/FlowContext";
import Home from "@/pages/public/Home";
import HowItWorks from "@/pages/public/HowItWorks";
import CareLinePage from "@/pages/public/CareLinePage";
import Pricing from "@/pages/public/Pricing";
import Doctors from "@/pages/public/Doctors";
import Transparency from "@/pages/public/Transparency";
import { ContentPage, FaqPage, NotFound, NotServed } from "@/pages/public/SimplePages";
import { Cancellation, Privacy, Terms, Tcle } from "@/pages/public/Legal";
import Entrar from "@/pages/Entrar";
import FlowShell from "@/pages/flow/FlowShell";
import StepMotivo from "@/pages/flow/StepMotivo";
import StepConta from "@/pages/flow/StepConta";
import StepTriagem from "@/pages/flow/StepTriagem";
import StepAgenda from "@/pages/flow/StepAgenda";
import StepPagamento from "@/pages/flow/StepPagamento";
import StepConfirmado from "@/pages/flow/StepConfirmado";
import AccountShell from "@/pages/account/AccountShell";
import { DocumentPage, Help, MyAppointments, MyData, MyDocuments, MyPayments } from "@/pages/account/AccountPages";
import PanelShell from "@/pages/panel/PanelShell";
import ProfessionalSignup from "@/pages/professional/ProfessionalSignup";
import ProfessionalHours from "@/pages/professional/ProfessionalHours";
import { PanelAccess, PanelActives, PanelAgenda, PanelDoctor, PanelPrices, PanelProfessionals, PanelReports, PanelTriage } from "@/pages/panel/PanelPages";

export default function App() {
  return (
    <FlowProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          {/* Páginas públicas */}
          <Route index element={<Home />} />
          <Route path="como-funciona" element={<HowItWorks />} />
          <Route path="cabelo" element={<CareLinePage slug="cabelo" />} />
          <Route path="pele" element={<CareLinePage slug="pele" />} />
          <Route path="sono-e-energia" element={<CareLinePage slug="sono-e-energia" />} />
          <Route path="suplementacao" element={<CareLinePage slug="suplementacao" />} />
          <Route path="preco" element={<Pricing />} />
          <Route path="medicos" element={<Doctors />} />
          <Route path="transparencia" element={<Transparency />} />
          <Route path="o-que-nao-atendemos" element={<NotServed />} />
          <Route path="perguntas" element={<FaqPage />} />
          <Route path="conteudo" element={<ContentPage />} />
          <Route path="termos" element={<Terms />} />
          <Route path="privacidade" element={<Privacy />} />
          <Route path="tcle" element={<Tcle />} />
          <Route path="cancelamento" element={<Cancellation />} />
          <Route path="entrar" element={<Entrar />} />
          <Route
            path="profissional/cadastro"
            element={
              <RequireAuth>
                <ProfessionalSignup />
              </RequireAuth>
            }
          />

          {/* Fluxo de agendamento */}
          <Route path="comecar" element={<FlowShell />}>
            <Route index element={<StepMotivo />} />
            <Route path="conta" element={<StepConta />} />
            <Route path="triagem" element={<StepTriagem />} />
            <Route path="agenda" element={<StepAgenda />} />
            <Route path="pagamento" element={<StepPagamento />} />
            <Route path="confirmado" element={<StepConfirmado />} />
          </Route>

          {/* Área do paciente */}
          <Route
            path="minha-conta"
            element={
              <RequireAuth>
                <AccountShell />
              </RequireAuth>
            }
          >
            <Route index element={<MyAppointments />} />
            <Route path="documentos" element={<MyDocuments />} />
            <Route path="documentos/:id" element={<DocumentPage />} />
            <Route path="pagamentos" element={<MyPayments />} />
            <Route path="dados" element={<MyData />} />
            <Route path="ajuda" element={<Help />} />
          </Route>

          {/* Painel interno, por papel */}
          <Route
            path="painel"
            element={
              <RequireAuth>
                <PanelShell />
              </RequireAuth>
            }
          >
            <Route index element={<RequireRole roles={["staff", "admin", "medical_director"]}><PanelAgenda /></RequireRole>} />
            <Route path="horarios" element={<RequireProfessional><ProfessionalHours /></RequireProfessional>} />
            <Route path="medico" element={<RequireProfessional><PanelDoctor /></RequireProfessional>} />
            <Route path="ativos" element={<RequireProfessional><PanelActives /></RequireProfessional>} />
            <Route path="profissionais" element={<RequireRole roles={["admin", "staff"]}><PanelProfessionals /></RequireRole>} />
            <Route path="precos" element={<RequireRole roles={["admin"]}><PanelPrices /></RequireRole>} />
            <Route path="triagem" element={<RequireRole roles={["medical_director"]}><PanelTriage /></RequireRole>} />
            <Route path="relatorios" element={<RequireRole roles={["staff", "admin", "medical_director"]}><PanelReports /></RequireRole>} />
            <Route path="acessos" element={<RequireRole roles={["admin"]}><PanelAccess /></RequireRole>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </FlowProvider>
  );
}
