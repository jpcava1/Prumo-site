/**
 * Sugestões prontas para o "Seu Plano" do paciente.
 * O profissional salva as que quiser na própria biblioteca e adiciona à ficha com um clique.
 * REGRA: nenhum nome de remédio, ativo ou dose, e nenhuma promessa de resultado.
 */
export type PlanSection = "objetivo" | "meta" | "cafe" | "almoco" | "lanche" | "jantar" | "rotina" | "cuidado" | "exame";

export const PLAN_SECTIONS: Record<PlanSection, { label: string; short: string }> = {
  objetivo: { label: "Objetivos", short: "Objetivo" },
  meta: { label: "Metas", short: "Meta" },
  cafe: { label: "Café da manhã", short: "Café da manhã" },
  almoco: { label: "Almoço", short: "Almoço" },
  lanche: { label: "Lanche da tarde", short: "Lanche" },
  jantar: { label: "Jantar", short: "Jantar" },
  rotina: { label: "Rotina e hábitos", short: "Rotina" },
  cuidado: { label: "Cuidados", short: "Cuidado" },
  exame: { label: "Exames pedidos", short: "Exame" },
};

export const MEAL_SECTIONS: PlanSection[] = ["cafe", "almoco", "lanche", "jantar"];

/** Seções que cada profissional usa na ficha, na ordem em que aparecem no PDF. */
export const SECTIONS_BY_KIND: Record<"medico" | "nutricionista", PlanSection[]> = {
  nutricionista: ["objetivo", "meta", "cafe", "almoco", "lanche", "jantar", "rotina", "exame"],
  medico: ["objetivo", "meta", "rotina", "cuidado", "exame"],
};

export interface PlanSuggestion {
  section: PlanSection;
  title: string;
  detail?: string;
}

export const PLAN_SUGGESTIONS: PlanSuggestion[] = [
  // Objetivos
  { section: "objetivo", title: "Mais energia no dia a dia" },
  { section: "objetivo", title: "Dormir melhor" },
  { section: "objetivo", title: "Cuidar da saúde do cabelo" },
  { section: "objetivo", title: "Cuidar da pele" },
  { section: "objetivo", title: "Alimentação mais equilibrada" },
  { section: "objetivo", title: "Mais disposição nos treinos" },

  // Metas
  { section: "meta", title: "Fazer 4 refeições por dia", detail: "Nos próximos 30 dias, sem pular o café da manhã." },
  { section: "meta", title: "Beber 2 litros de água por dia", detail: "Uma garrafa de 500 ml quatro vezes ao dia." },
  { section: "meta", title: "Dormir antes das 23h", detail: "Pelo menos 5 noites por semana." },
  { section: "meta", title: "Treinar 3 vezes por semana", detail: "Pode ser caminhada, musculação ou o esporte que você gosta." },
  { section: "meta", title: "Retorno em 60 dias", detail: "Para conversar sobre como foi e ajustar o plano." },

  // Café da manhã
  { section: "cafe", title: "Iogurte natural com fruta e aveia", detail: "1 pote de iogurte, 1 fruta picada e 2 colheres de aveia." },
  { section: "cafe", title: "Pão integral com ovos mexidos", detail: "2 fatias de pão, 2 ovos e 1 fruta." },
  { section: "cafe", title: "Tapioca com queijo branco e mamão", detail: "1 tapioca média, 1 fatia de queijo e meio mamão." },
  { section: "cafe", title: "Vitamina de banana com aveia", detail: "Leite ou bebida vegetal, 1 banana e 2 colheres de aveia." },
  { section: "cafe", title: "Cuscuz com ovo", detail: "1 xícara de cuscuz, 1 ovo e café sem açúcar." },

  // Almoço
  { section: "almoco", title: "Arroz, feijão, frango grelhado e salada", detail: "Metade do prato com salada e legumes." },
  { section: "almoco", title: "Peixe assado, batata-doce e legumes", detail: "Legumes no vapor ou assados." },
  { section: "almoco", title: "Carne magra, arroz, feijão e abobrinha", detail: "Folhas à vontade." },
  { section: "almoco", title: "Omelete de legumes com salada e quinoa", detail: "Boa opção sem carne." },

  // Lanche da tarde
  { section: "lanche", title: "Fruta com castanhas", detail: "1 fruta e 1 punhado pequeno de castanhas." },
  { section: "lanche", title: "Iogurte natural com chia", detail: "1 pote e 1 colher de chia." },
  { section: "lanche", title: "Pão integral com pasta de amendoim", detail: "1 fatia e 1 colher rasa." },
  { section: "lanche", title: "Palitos de cenoura com homus", detail: "Prático para levar ao trabalho." },

  // Jantar
  { section: "jantar", title: "Sopa de legumes com frango desfiado" },
  { section: "jantar", title: "Salada completa com ovo e grão-de-bico" },
  { section: "jantar", title: "Wrap integral com atum e folhas" },
  { section: "jantar", title: "Peixe grelhado com purê de abóbora" },

  // Rotina e hábitos
  { section: "rotina", title: "Água ao longo do dia", detail: "Um copo ao acordar e um em cada refeição." },
  { section: "rotina", title: "Dormir de 7 a 9 horas", detail: "Deitar e acordar sempre no mesmo horário." },
  { section: "rotina", title: "Caminhada de 30 minutos", detail: "5 dias por semana, no ritmo de conversa." },
  { section: "rotina", title: "Exercício de força", detail: "2 a 3 vezes por semana." },
  { section: "rotina", title: "Telas desligadas 1 hora antes de dormir", detail: "Troque por leitura ou alongamento." },
  { section: "rotina", title: "Sol pela manhã", detail: "15 minutos de luz natural logo cedo ajudam a regular o sono." },
  { section: "rotina", title: "Refeições sem tela", detail: "Comer devagar, prestando atenção na comida." },
  { section: "rotina", title: "Alongamento ao acordar", detail: "10 minutos antes de começar o dia." },

  // Cuidados (médico)
  { section: "cuidado", title: "Protetor solar todos os dias", detail: "FPS 30 ou mais, reaplicar a cada 2 horas no sol." },
  { section: "cuidado", title: "Lavar o rosto 2 vezes ao dia", detail: "Com sabonete suave, sem esfregar." },
  { section: "cuidado", title: "Evitar penteados muito apertados", detail: "Tranças e rabos de cavalo apertados forçam os fios." },
  { section: "cuidado", title: "Evitar café depois das 16h", detail: "Ajuda a pegar no sono mais fácil." },
  { section: "cuidado", title: "Anotar o sono por 2 semanas", detail: "Horário de deitar, acordar e como se sentiu. Traga no retorno." },
  { section: "cuidado", title: "Usar a fórmula sempre no mesmo horário", detail: "Conforme a receita." },
  { section: "cuidado", title: "Quando procurar atendimento presencial", detail: "Febre, dor forte ou piora rápida. Em urgência, ligue 192." },

  // Exames
  { section: "exame", title: "Hemograma completo" },
  { section: "exame", title: "Glicemia de jejum" },
  { section: "exame", title: "Perfil lipídico" },
  { section: "exame", title: "Ferritina" },
  { section: "exame", title: "Vitamina D (25-OH)" },
  { section: "exame", title: "Vitamina B12" },
  { section: "exame", title: "TSH e T4 livre" },
  { section: "exame", title: "Ureia e creatinina" },
];
