import type { Question, TriageDefinition } from "@/lib/triage/schema";
import type { CareLineSlug } from "@/content/careLines";

/**
 * Triagem versão 1 (briefing, seção 7).
 * ATENÇÃO: a versão final precisa ser aprovada pelo médico diretor técnico.
 * Em produção a triagem vem da tabela triage_versions; este arquivo gera o seed
 * (npm run seed:triage) e serve ao modo demonstração.
 */

const common: Question[] = [
  {
    id: "sexo",
    type: "single",
    label: "Qual é o seu sexo ao nascer?",
    help: "Algumas condições e cuidados mudam conforme o sexo biológico.",
    required: true,
    options: [
      { value: "F", label: "Feminino" },
      { value: "M", label: "Masculino" },
    ],
  },
  {
    id: "gestacao",
    type: "single",
    label: "Você está grávida, amamentando ou tentando engravidar?",
    required: true,
    showIf: { q: "sexo", op: "eq", value: "F" },
    options: [
      { value: "nao", label: "Não" },
      { value: "gravida", label: "Estou grávida" },
      { value: "amamentando", label: "Estou amamentando" },
      { value: "tentando", label: "Estou tentando engravidar" },
    ],
    alert: { when: { q: "gestacao", op: "in", value: ["gravida", "amamentando", "tentando"] }, code: "gestacao", label: "Gestação, amamentação ou tentativa de engravidar" },
  },
  { id: "peso", type: "number", label: "Qual é o seu peso?", unit: "kg", min: 30, max: 300, required: true },
  { id: "altura", type: "number", label: "Qual é a sua altura?", unit: "cm", min: 120, max: 230, required: true },
  {
    id: "doencas",
    type: "multi",
    label: "Você tem ou já teve alguma destas condições?",
    required: true,
    exclusiveValue: "nenhuma",
    options: [
      { value: "pressao_alta", label: "Pressão alta" },
      { value: "coracao", label: "Doença do coração" },
      { value: "figado", label: "Doença do fígado" },
      { value: "rins", label: "Doença dos rins" },
      { value: "diabetes", label: "Diabetes" },
      { value: "tireoide", label: "Problema de tireoide" },
      { value: "cancer", label: "Câncer" },
      { value: "nenhuma", label: "Nenhuma" },
    ],
    alert: { when: { q: "doencas", op: "includesAny", value: ["coracao", "figado", "rins", "cancer"] }, code: "comorbidade", label: "Doença de coração, fígado, rins ou câncer" },
  },
  {
    id: "uso_atual",
    type: "text",
    label: "Você usa algum remédio, vitamina ou suplemento hoje? Quais?",
    help: "Se não usa nada, escreva \"nenhum\".",
    maxLength: 600,
    required: true,
  },
  {
    id: "alergias",
    type: "text",
    label: "Você tem alergia a algum remédio ou substância? Qual?",
    help: "Se não tem, escreva \"nenhuma\".",
    maxLength: 400,
    required: true,
  },
  {
    id: "cirurgia_recente",
    type: "yesno",
    label: "Você fez cirurgia ou ficou internado nos últimos 6 meses?",
    required: true,
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
    ],
    alert: { when: { q: "cirurgia_recente", op: "eq", value: "sim" }, code: "cirurgia_recente", label: "Cirurgia ou internação nos últimos 6 meses" },
  },
  {
    id: "urgencia",
    type: "multi",
    label: "Agora, neste momento, você sente algum destes sinais?",
    required: true,
    exclusiveValue: "nenhum",
    options: [
      { value: "dor_peito", label: "Dor ou aperto no peito" },
      { value: "falta_ar", label: "Falta de ar" },
      { value: "desmaio", label: "Desmaio ou quase desmaio" },
      { value: "fraqueza_lado", label: "Fraqueza ou formigamento de um lado do corpo" },
      { value: "sangramento", label: "Sangramento que não para" },
      { value: "nenhum", label: "Nenhum destes" },
    ],
    block: { when: { q: "urgencia", op: "excludesAll", value: ["nenhum"] }, kind: "emergency" },
  },
];

const closing: Question[] = [
  {
    id: "relato",
    type: "text",
    label: "Conte com suas palavras o que está acontecendo e o que você espera da consulta.",
    maxLength: 1000,
    required: true,
  },
];

const byLine: Record<CareLineSlug, Question[]> = {
  "energia-e-disposicao": [
    {
      id: "sono_horas",
      type: "number",
      label: "Quantas horas você dorme por noite, em média?",
      unit: "horas",
      min: 0,
      max: 16,
      required: true,
    },
    {
      id: "sono_dificuldade",
      type: "multi",
      label: "O que acontece com o seu sono?",
      required: true,
      exclusiveValue: "nenhuma",
      options: [
        { value: "demora_dormir", label: "Demoro para dormir" },
        { value: "acorda_noite", label: "Acordo durante a noite" },
        { value: "acorda_cedo", label: "Acordo cedo demais" },
        { value: "acorda_cansado", label: "Acordo cansado" },
        { value: "nenhuma", label: "Nenhuma destas" },
      ],
    },
    {
      id: "sono_ronco",
      type: "yesno",
      label: "Alguém já disse que você ronca alto ou para de respirar dormindo?",
      required: true,
      options: [
        { value: "sim", label: "Sim" },
        { value: "nao", label: "Não" },
        { value: "nao_sei", label: "Não sei" },
      ],
      alert: { when: { q: "sono_ronco", op: "eq", value: "sim" }, code: "suspeita_apneia", label: "Ronco com pausas: considerar investigação de apneia" },
    },
    {
      id: "sono_cafe_alcool",
      type: "text",
      label: "Quanto café e álcool você consome por dia ou por semana?",
      maxLength: 300,
      required: true,
    },
    {
      id: "sono_humor",
      type: "yesno",
      label: "Nas últimas duas semanas, você se sentiu para baixo ou sem esperança na maior parte dos dias?",
      required: true,
      options: [
        { value: "sim", label: "Sim" },
        { value: "nao", label: "Não" },
      ],
      alert: { when: { q: "sono_humor", op: "eq", value: "sim" }, code: "humor_baixo", label: "Humor baixo nas últimas 2 semanas" },
      support: { when: { q: "sono_humor", op: "eq", value: "sim" }, kind: "cvv" },
    },
  ],
  dieta: [
    {
      id: "dieta_objetivo",
      type: "single",
      label: "Qual é o seu principal objetivo com a alimentação?",
      required: true,
      options: [
        { value: "organizar", label: "Organizar a alimentação do dia a dia" },
        { value: "energia", label: "Ter mais energia" },
        { value: "treino", label: "Apoiar a rotina de treino" },
        { value: "outro", label: "Outro" },
      ],
    },
    {
      id: "dieta_padrao",
      type: "single",
      label: "Como é a sua alimentação?",
      required: true,
      options: [
        { value: "onivoro", label: "Como de tudo" },
        { value: "vegetariano", label: "Vegetariana" },
        { value: "vegano", label: "Vegana" },
      ],
    },
    {
      id: "dieta_refeicoes",
      type: "number",
      label: "Quantas refeições você faz por dia?",
      unit: "refeições",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: "dieta_compulsao",
      type: "yesno",
      label: "Você sente que perde o controle quando come ou tem medo de engordar a ponto de evitar comer?",
      required: true,
      options: [
        { value: "sim", label: "Sim" },
        { value: "nao", label: "Não" },
      ],
      alert: { when: { q: "dieta_compulsao", op: "eq", value: "sim" }, code: "transtorno_alimentar", label: "Possível transtorno alimentar: avaliar encaminhamento" },
    },
    {
      id: "dieta_exames",
      type: "files",
      label: "Tem exames de sangue dos últimos 6 meses? Envie em PDF (opcional)",
      maxFiles: 3,
      required: false,
    },
  ],
  treino: [
    {
      id: "treino_atual",
      type: "number",
      label: "Quantos dias por semana você faz atividade física hoje?",
      unit: "dias",
      min: 0,
      max: 7,
      required: true,
    },
    {
      id: "treino_objetivo",
      type: "single",
      label: "Qual é o seu principal objetivo?",
      required: true,
      options: [
        { value: "comecar", label: "Começar a treinar" },
        { value: "condicionamento", label: "Melhorar o condicionamento" },
        { value: "forca", label: "Ganhar força" },
        { value: "outro", label: "Outro" },
      ],
    },
    {
      id: "treino_sintomas",
      type: "multi",
      label: "Durante o esforço, você já sentiu algum destes sinais?",
      required: true,
      exclusiveValue: "nenhum",
      options: [
        { value: "dor_peito", label: "Dor ou aperto no peito" },
        { value: "falta_ar", label: "Falta de ar fora do normal" },
        { value: "tontura", label: "Tontura ou desmaio" },
        { value: "palpitacao", label: "Coração disparado" },
        { value: "nenhum", label: "Nenhum destes" },
      ],
      alert: { when: { q: "treino_sintomas", op: "excludesAll", value: ["nenhum"] }, code: "sintoma_esforco", label: "Sintoma durante o esforço: avaliar antes de liberar treino" },
    },
    {
      id: "treino_lesoes",
      type: "text",
      label: "Você tem alguma lesão ou dor que atrapalha o treino? Qual?",
      help: "Se não tem, escreva \"nenhuma\".",
      maxLength: 400,
      required: true,
    },
  ],
  suplementacao: [
    {
      id: "supl_objetivo",
      type: "single",
      label: "Qual é o seu principal objetivo?",
      required: true,
      options: [
        { value: "energia", label: "Mais energia no dia a dia" },
        { value: "treino", label: "Apoio à rotina de treino" },
        { value: "imunidade", label: "Imunidade" },
        { value: "outro", label: "Outro" },
      ],
    },
    {
      id: "supl_alimentacao",
      type: "single",
      label: "Como é a sua alimentação?",
      required: true,
      options: [
        { value: "onivoro", label: "Como de tudo" },
        { value: "vegetariano", label: "Vegetariana" },
        { value: "vegano", label: "Vegana" },
      ],
    },
    {
      id: "supl_atividade",
      type: "number",
      label: "Quantos dias por semana você faz atividade física?",
      unit: "dias",
      min: 0,
      max: 7,
      required: true,
    },
    {
      id: "supl_exames",
      type: "files",
      label: "Tem exames de sangue dos últimos 6 meses? Envie em PDF (opcional)",
      maxFiles: 3,
      required: false,
    },
  ],
};

const titles: Record<CareLineSlug, string> = {
  "energia-e-disposicao": "Triagem — Energia e disposição",
  dieta: "Triagem — Dieta",
  treino: "Triagem — Treino",
  suplementacao: "Triagem — Suplementação",
};

export function triageV1(slug: CareLineSlug): TriageDefinition {
  return {
    care_line: slug,
    title: titles[slug],
    intro: "Estas respostas vão para o médico antes da consulta. Leva cerca de 5 minutos.",
    questions: [...common, ...byLine[slug], ...closing],
  };
}
