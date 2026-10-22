/**
 * Conteúdo das linhas de cuidado.
 * REGRA: nenhum nome de remédio, ativo, fórmula ou dose. Nenhuma promessa de resultado.
 * Preço e status reais vêm da tabela care_lines (editável no painel); aqui ficam só os textos.
 */
export type CareLineSlug = "energia-e-disposicao" | "dieta" | "treino" | "suplementacao";

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
  "energia-e-disposicao": {
    slug: "energia-e-disposicao",
    name: "Energia e disposição",
    short: "Cansaço, sono ruim e falta de pique",
    heroTitle: "Viver cansado não precisa ser o normal.",
    heroText:
      "Um médico investiga com você sono, rotina, alimentação e sinais que merecem atenção, e orienta os próximos passos.",
    forWho: [
      "Quem acorda cansado mesmo dormindo muitas horas",
      "Quem sente falta de energia ao longo do dia",
      "Quem demora para dormir ou acorda várias vezes",
    ],
    doctorLooksAt: [
      "Sua rotina de sono e de trabalho",
      "Consumo de café, álcool e telas",
      "Sinais que pedem exame, como ronco com pausas na respiração",
      "Se faz sentido pedir exames de sangue",
    ],
    faq: [
      { q: "Vocês receitam remédio para dormir controlado?", a: "Não. Remédios controlados não podem ser dispensados a distância. Se for o caso, o médico encaminha você para acompanhamento presencial." },
      { q: "O cansaço pode ser algo no sangue?", a: "Pode. Se o médico achar necessário, ele pede exames e avalia o resultado com você num retorno." },
    ],
  },
  dieta: {
    slug: "dieta",
    name: "Dieta",
    short: "Alimentação que cabe na sua rotina",
    heroTitle: "Comer bem começa por entender como você come hoje.",
    heroText:
      "Um médico avalia sua alimentação, sua rotina e seus exames e monta com você ajustes simples e possíveis.",
    forWho: [
      "Quem quer organizar a alimentação do dia a dia",
      "Quem tem alimentação vegetariana ou vegana",
      "Quem quer alinhar a alimentação com a rotina de treino",
    ],
    doctorLooksAt: [
      "O que você come num dia normal",
      "Horários, fome e o que atrapalha a sua rotina",
      "Exames dos últimos 6 meses, se você tiver",
      "Se faz sentido acompanhar com nutricionista",
    ],
    faq: [
      { q: "Vocês fazem tratamento para emagrecer com remédio?", a: "Não. Emagrecimento com remédio, incluindo canetas, fica fora do nosso atendimento." },
      { q: "Vou receber um cardápio?", a: "O médico orienta ajustes na alimentação. Se você precisar de um plano detalhado, ele indica acompanhamento com nutricionista." },
    ],
  },
  treino: {
    slug: "treino",
    name: "Treino",
    short: "Começar ou ajustar a atividade física",
    heroTitle: "Treinar com segurança começa com uma avaliação.",
    heroText:
      "Um médico avalia sua saúde, sua rotina e seus objetivos antes de você começar ou mudar a sua atividade física.",
    forWho: [
      "Quem quer começar a treinar e não sabe por onde",
      "Quem já treina e quer ajustar rotina, sono e alimentação",
      "Quem quer saber se está tudo bem para aumentar o ritmo",
    ],
    doctorLooksAt: [
      "Sua atividade física hoje e seus objetivos",
      "Sintomas durante o esforço, como dor no peito ou falta de ar",
      "Lesões e dores que atrapalham o treino",
      "Se faz sentido pedir exames antes de começar",
    ],
    faq: [
      { q: "Vocês montam a planilha de treino?", a: "Não. O médico avalia sua saúde e orienta. A planilha fica com um profissional de educação física." },
      { q: "Preciso de exames antes de treinar?", a: "Depende da sua idade, da sua saúde e do treino que você quer fazer. O médico avalia e, se precisar, pede." },
    ],
  },
  suplementacao: {
    slug: "suplementacao",
    name: "Suplementação",
    short: "Vitaminas e minerais, com critério",
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

export const launchSlugs: CareLineSlug[] = ["energia-e-disposicao", "dieta", "treino", "suplementacao"];

export const notServed = [
  "Urgências e emergências (ligue 192)",
  "Menores de 18 anos",
  "Emagrecimento com remédio, incluindo canetas",
  "Saúde mental e remédios controlados",
  "Hormônios para fins estéticos ou de desempenho",
  "Medicamentos injetáveis",
];
