/**
 * Dados institucionais da Prumo (empresa A).
 * TODO antes de publicar: substituir todos os campos marcados com [PREENCHER].
 * Estes dados aparecem no rodapé e na página /transparencia (Res. CFM 2.314/2022 e 2.336/2023).
 */
export const company = {
  brand: "Prumo",
  tagline: "Sua saúde no prumo",
  legalName: "[PREENCHER] Prumo Serviços Médicos Ltda.",
  cnpj: "[PREENCHER] 00.000.000/0001-00",
  crmRegistration: "[PREENCHER] CRM-PR nº 0000 (registro da empresa)",
  technicalDirector: { name: "[PREENCHER] Dr(a). Nome Sobrenome", crm: "[PREENCHER] CRM-PR 00000" },
  dpo: { name: "[PREENCHER] Nome do encarregado", email: "privacidade@seudominio.com.br" },
  address: "[PREENCHER] Endereço da sede, Arapongas/PR",
  supportWhatsapp: "[PREENCHER] (43) 90000-0000",
  supportEmail: "contato@seudominio.com.br",
  ombudsmanEmail: "ouvidoria@seudominio.com.br",
};

/** Site da Farmashop (empresa B, outro CNPJ). O botão só abre este link. Nada é enviado. */
export const FARMASHOP_URL: string =
  import.meta.env.VITE_FARMASHOP_URL || "https://www.farmashop.com.br/enviar-receita";

export const pharmacyPartner = {
  name: "Farmashop",
  description:
    "Farmácia de manipulação de Arapongas (PR), com farmacêutico responsável. Recebe a sua receita, faz o orçamento e entrega em casa.",
};

/** Políticas operacionais (briefing, seção 6). */
export const policy = {
  consultMinutes: 30,
  holdMinutes: 15,
  freeRescheduleHours: 2,
  joinOpensMinutesBefore: 10,
  noShowAfterMinutes: 10,
  bookingWindowDays: 14,
  minLeadMinutes: 60,
  maxInstallments: 3,
};

/** Versões dos documentos legais. Ao mudar um texto, suba a versão: o aceite é gravado com ela. */
export const legalVersions = {
  termos: "2026-10-v1",
  privacidade: "2026-10-v1",
  dados_saude: "2026-10-v1",
  tcle: "2026-10-v1",
  cancelamento: "2026-10-v1",
} as const;
