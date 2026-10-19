import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Estado do fluxo /comecar. Fica só em memória (nada de dado de saúde em
 * localStorage, URL ou analytics). As respostas da triagem vão direto para o banco.
 */
interface FlowState {
  careLine: string | null;
  triageResponseId: string | null;
  appointmentId: string | null;
  kind: "primeira" | "retorno";
  setCareLine: (s: string) => void;
  setTriageResponseId: (id: string | null) => void;
  setAppointmentId: (id: string | null) => void;
  setKind: (k: "primeira" | "retorno") => void;
  reset: () => void;
}

const FlowContext = createContext<FlowState | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [careLine, setCareLineState] = useState<string | null>(null);
  const [triageResponseId, setTriageResponseId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [kind, setKind] = useState<"primeira" | "retorno">("primeira");

  const value = useMemo<FlowState>(
    () => ({
      careLine,
      triageResponseId,
      appointmentId,
      kind,
      setCareLine: (s) => {
        if (s !== careLine) setTriageResponseId(null);
        setCareLineState(s);
      },
      setTriageResponseId,
      setAppointmentId,
      setKind,
      reset: () => {
        setCareLineState(null);
        setTriageResponseId(null);
        setAppointmentId(null);
        setKind("primeira");
      },
    }),
    [careLine, triageResponseId, appointmentId, kind],
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow precisa estar dentro de FlowProvider");
  return ctx;
}
