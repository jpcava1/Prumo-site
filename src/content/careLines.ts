/**
 * Conteúdo das linhas de cuidado.
 * REGRA: nenhum nome de remédio, ativo, fórmula ou dose. Nenhuma promessa de resultado.
 * Preço e status reais vêm da tabela care_lines (editável no painel); aqui ficam só os textos.
 */
export type CareLineSlug = "cabelo" | "pele" | "sono-e-energia" | "suplementacao";

export interface CareLineContent {
  slug: CareLineSlug;
  name: string;
  short: string;
  heroTitle: string;
  heroText: string;
  forWho: string[];
  doctorLooksAt: string[];
  faq: { q: string; a: string }[];
}

export const careLineContent: Record<CareLineSlug, CareLineContent> = {
  cabelo: {
    slug: "cabelo",
    name: "Cabelo",
    short: "Queda, falhas ou fios mais finos",
    heroTitle: "Queda de cabelo merece uma avaliação de verdade.",
    heroText:
      "Um médico entende o seu padrão de queda, o seu histórico e o que você já tentou. Consulta por vídeo de até 30 minutos.",
    forWho: [
      "Quem percebeu mais fios no travesseiro, no banho ou na escova",
      "Quem notou entradas, falhas ou o couro cabeludo mais aparente",
      "Quem já tentou algo por conta própria e quer uma orientação médica",
    ],
    doctorLooksAt: [
      "Há quanto tempo e onde a queda aparece",
      "Histórico familiar e de saúde",
      "Fotos do couro cabeludo, se você quiser enviar",
      "Se é caso para exame ou avaliação presencial",
    ],
    faq: [
      { q: "Preciso enviar fotos?", a: "Não é obrigatório, mas ajuda o médico a entender o seu caso. As fotos ficam guardadas com segurança e só ele vê." },
      { q: "Em quanto tempo vejo resultado?", a: "Depende da causa e da conduta. O médico conversa com você sobre expectativas realistas e sobre quando fazer um retorno." },
    ],
  },
  pele: {
    slug: "pele",
    name: "Pele",
    short: "Manchas, oleosidade e sinais do tempo",
    heroTitle: "Cuidar da pele começa por entender a sua pele.",
    heroText:
      "Manchas, oleosidade ou sinais do tempo: um médico avalia o seu caso por vídeo e monta com você um plano de cuidado.",
    forWho: [
      "Quem tem manchas que incomodam",
      "Quem sofre com oleosidade ou espinhas leves",
      "Quem quer uma rotina de cuidado orientada por um médico",
    ],
    doctorLooksAt: [
      "Sua queixa principal e há quanto tempo ela existe",
      "Exposição ao sol e o que você usa hoje",
      "Fotos da pele, se você quiser enviar",
      "Se alguma lesão precisa de avaliação presencial",
    ],
    faq: [
      { q: "Vocês atendem acne grave?", a: "Casos que exigem tratamento com remédio controlado ou acompanhamento presencial são encaminhados. O médico orienta o melhor caminho." },
      { q: "E se eu tiver uma pinta que mudou?", a: "Pinta que cresce, muda de cor ou sangra precisa de exame presencial com dermatologista. A triagem avisa o médico, e ele orienta você." },
    ],
  },
  "sono-e-energia": {
    slug: "sono-e-energia",
    name: "Sono e energia",
    short: "Dormir mal, cansaço e falta de disposição",
    heroTitle: "Dormir mal e acordar cansado não precisa ser normal.",
    heroText:
      "Um médico investiga com você hábitos, rotina e sinais que merecem atenção, e orienta os próximos passos.",
    forWho: [
      "Quem demora para dormir ou acorda várias vezes",
      "Quem acorda cansado mesmo dormindo muitas horas",
      "Quem sente falta de energia no dia a dia",
    ],
    doctorLooksAt: [
      "Sua rotina de sono e de trabalho",
      "Consumo de café, álcool e telas",
      "Sinais que pedem exame, como ronco com pausas na respiração",
      "Se faz sentido pedir exames de sangue",
    ],
    faq: [
      { q: "Vocês receitam remédio para dormir controlado?", a: "Não. Remédios controlados não podem ser dispensados a distância. Se for o caso, o médico encaminha você para acompanhamento presencial." },
      { q: "Posso ter apneia do sono?", a: "A triagem pergunta sobre ronco e pausas na respiração. Se houver sinais, o médico orienta o exame adequado." },
    ],
  },
  suplementacao: {
    slug: "suplementacao",
    name: "Suplementação",
    short: "Vitaminas, minerais e rotina de treino",
    heroTitle: "Suplementar com critério, não por moda.",
    heroText:
      "Um médico avalia sua alimentação, rotina, objetivos e exames recentes antes de qualquer indicação.",
    forWho: [
      "Quem quer saber se precisa mesmo suplementar",
      "Quem tem alimentação vegetariana ou vegana",
      "Quem treina e quer orientação para a rotina",
    ],
    doctorLooksAt: [
      "Seu padrão alimentar e seus objetivos",
      "Atividade física por semana",
      "Exames dos últimos 6 meses, se você tiver",
      "Se faz sentido pedir novos exames antes",
    ],
    faq: [
      { q: "Preciso ter exames?", a: "Não é obrigatório. Se você tiver exames recentes, pode enviar em PDF. Se o médico precisar, ele pede novos exames." },
      { q: "Vou sair com uma receita?", a: "Só se houver indicação. Muitas vezes a orientação é ajustar a alimentação primeiro." },
    ],
  },
};

export const launchSlugs: CareLineSlug[] = ["cabelo", "pele", "sono-e-energia", "suplementacao"];

export const notServed = [
  "Urgências e emergências (ligue 192)",
  "Menores de 18 anos",
  "Emagrecimento com remédio, incluindo canetas",
  "Saúde mental e remédios controlados",
  "Hormônios para fins estéticos ou de desempenho",
  "Medicamentos injetáveis",
];
