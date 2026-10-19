# Prumo — Briefing do site (consulta online + fórmula manipulada)

Oct 19, 2026 · @João

## 1. Resumo e decisões

O site é da **Prumo** (empresa A, clínica online com registro no CRM-PR) e vende **uma consulta por vídeo de até 30 minutos**. Se o médico indicar fórmula manipulada, o paciente recebe a receita no próprio nome e escolhe a farmácia; a **Farmashop** aparece integrada, a um clique, ao lado da opção de levar a receita para qualquer outra farmácia.

**Três ajustes obrigatórios ao modelo que você descreveu.** Sem eles, o site repete o padrão que a Anvisa puniu em 2026 (Voy, Prista, ICT, Formedica) e expõe a Farmashop, que é quem leva a sanção sanitária.

1. **O site não é "da Farmashop" nem vende manipulado.** Farmácia não pode oferecer consulta médica, e manipulado não pode ser exposto ao público para venda (RDC 67/2007, item 5.14). Quem vende é a Prumo; a Farmashop só entra no fim.
2. **"Nós faremos a produção" vira "a Farmashop produz, se o paciente escolher".** É vedada a captação de receitas e a intermediação entre empresas (RDC 67/2007), e o médico não pode atuar em dependência de farmácia (Código de Ética Médica, arts. 68 e 69).
3. **A consulta não termina em receita por definição.** O médico pode prescrever, não prescrever, indicar industrializado ou encaminhar para presencial, e recebe o mesmo valor em qualquer desfecho.

**Decisão recomendada.** Construir três peças: (a) site Prumo no Lovable com triagem, agenda, pagamento e área do paciente; (b) teleconsulta, prontuário e receita numa plataforma certificada NGS2, integrada ao site; (c) página própria da Farmashop, no domínio e CNPJ dela, para receber receitas. Lançar com 4 linhas de cuidado e tudo configurável pelo painel.

**Maior risco do negócio.** A consulta sozinha deixa entre R$ 10 e R$ 19 por atendimento antes da aquisição (seção 13). O lucro das fórmulas fica na Farmashop e não pode voltar para a Prumo. Parecer jurídico antes de ligar mídia paga.

**Fatos novos de 2026 que mudam o desenho:** a Anvisa suspendeu a Voy em junho por tratar o questionário como software médico e só a liberou em 05/08/2026 nesta configuração; a Res. CFM 2.454/2026 exige governança para IA em decisão clínica (por isso a triagem é sem IA); a RDC 1.000/2025 colocou receitas sujeitas à retenção no sistema nacional da Anvisa (SNCR); e a Lei 15.357/2026 permite farmácia contratar plataformas para entrega, ainda sem regulamentação da Anvisa.

## 2. O modelo em uma página

A Prumo cuida de tudo até a receita e recebe só pela consulta; a partir da receita, quem decide é o paciente.

&#91;embedded content: fluxo do paciente e do dinheiro · duas empresas\]

A Farmashop entra como opção integrada, com canal, CNPJ, farmacêutico e pagamento próprios. Se o paciente não clicar no botão dela, ela nunca fica sabendo da consulta.

## 3. Regras fixas viram requisitos de software

Cada regra do modelo precisa existir no código, não só no contrato. Esta tabela é a lista de restrições que vai, sem alteração, para o CLAUDE.md e para o primeiro prompt do Lovable.

| Regra | Base | O que o sistema faz (e não faz) |
| --- | --- | --- |
| Livre escolha da farmácia | Código de Ética Médica, arts. 68 e 69; RDC 67/2007 (captação e intermediação); CDC art. 39, I | Tela da receita com dois botões de mesmo tamanho e cor: "Pedir na Farmashop" e "Baixar e levar a outra farmácia". PDF sempre baixável. A Prumo nunca envia a receita à farmácia. Registrar a % de pacientes que leva a receita para fora. |
| O app nunca indica remédio nem dose | Caso Voy (Anvisa, jun–ago/2026); Lei 12.842/2013 | Triagem com regras fixas, sem IA, sem pontuação e sem resultado do tipo "você precisa de X". Nenhum catálogo de ativos, fórmulas ou doses no site. Chat, se houver, só para agenda, pagamento e acesso. |
| Médico pago por consulta | CEM art. 69; Decreto 20.931/1932, art. 16 | Repasse calculado por atendimento concluído. Nenhuma coluna liga repasse a receita. Profissional não vê nenhum dado de venda de farmácia. |
| Duas empresas separadas | Checklist do projeto (08) | Dois domínios, dois CNPJs, duas contas de pagamento, dois bancos de dados. A Farmashop recebe só o que o paciente enviar a ela. |
| A Prumo não vende medicamento | Anvisa no caso Voy: empresa que não é farmácia não pode comercializar medicamento | O checkout da Prumo cobra só consulta. Preço de fórmula nunca aparece no site da Prumo. Nada de "consulta grátis comprando na Farmashop". |
| Telemedicina regular | Res. CFM 2.314/2022; Lei 14.510/2022 | Termo de consentimento (TCLE) antes da 1ª consulta; vídeo síncrono; prontuário NGS2; receita com assinatura ICP-Brasil; nome e CRM do diretor técnico no rodapé. |
| Publicidade | Res. CFM 2.336/2023; RDC 96/2008; RDC 67/2007, item 5.14 | Pode mostrar o preço da consulta. Não pode citar ativo, fórmula ou dose, prometer resultado ou mostrar cápsula e pote. |
| Escopo clínico | RDC 44/2009 (controlados não a distância); NT 200/2025 (GLP-1 injetável); Res. CFM 2.333/2023 (anabolizante estético) | Página "O que não atendemos" e bloqueio na triagem para emergência e menores de 18. O médico encaminha o resto. |
| IA | Res. CFM 2.454/2026 | Nenhuma IA na decisão clínica no lançamento. Se entrar depois: comissão de IA, registro no prontuário e decisão sempre do médico. |
| Dados de saúde | LGPD, art. 11; Lei 13.787/2018 | Consentimentos versionados; dados no Brasil; nada de dado de saúde em URL, log, pixel ou WhatsApp; prontuário guardado por 20 anos. |
| Prescrição sem marca | CEM; RDC 67/2007 | O médico prescreve ativo e dose, sem marca e sem farmácia. O rótulo é da farmácia que manipula, nunca da Prumo. |

## 4. Marca e direção visual

O nome segue **Prumo** ("Sua saúde no prumo"), escolhido no Business Plan v4, ainda sem depósito no INPI (classes 44, 35, 42 e 9) nem domínio registrado. Fazer as duas coisas antes de comprar mídia; até lá, o site sobe em subdomínio de teste.

**Posicionamento.** Para adultos de 25 a 55 anos que querem resolver cabelo, pele, sono ou suplementação sem fila, a Prumo é a clínica online que faz consulta de verdade com médico identificado, porque o nome e o CRM estão na tela, a receita é do paciente e a farmácia tem endereço e farmacêutico.

**Personalidade:** clara, calma, adulta. **Não é:** milagrosa, "biohacker", vendedora de pote.

| Certo | Errado |
| --- | --- |
| "Um médico avalia o seu caso em até 30 minutos." | "Acabe com a queda de cabelo em 30 dias." |
| "Se houver indicação, você recebe a receita e escolhe a farmácia." | "Receba sua fórmula exclusiva em casa." |
| "Nem toda consulta termina em receita. Isso é um bom sinal." | "Tratamento garantido." |

**Três rotas visuais (recomendo a A).**

| Rota | Ideia | Paleta | Tipografia (Google Fonts) |
| --- | --- | --- | --- |
| **A. Prumo calmo** (recomendada) | Clínica serena; o fio de prumo vira uma linha vertical que marca as etapas | Verde-pinho, off-white, ocre só em detalhes | Fraunces (títulos) + Inter (texto) |
| B. Laboratório preciso | Rigor técnico, dados e transparência | Azul-tinta, cinza frio, verde-menta | Instrument Sans + IBM Plex Mono |
| C. Humano quente | Acolhimento e conversa | Terracota, creme, marrom | DM Serif Display + DM Sans |

A rota A ganha porque o produto vende confiança, não tecnologia: o paciente precisa sentir "médico de verdade", e o verde-pinho foge do azul genérico de saúde e do roxo das startups de emagrecimento.

**Tokens da rota A (para o tailwind.config e as variáveis CSS):**

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--bg` | #F7F5EF | #121714 | Fundo |
| `--surface` | #FFFFFF | #1A211D | Cartões |
| `--ink` | #1F2A24 | #EEF1EC | Texto |
| `--muted` | #5E6B64 | #A3AEA8 | Texto secundário |
| `--primary` | #2F5D50 | #7FB8A4 | Botões e links |
| `--primary-soft` | #DCE8E2 | #24362F | Fundos de destaque |
| `--accent` | #C8873A | #D9A35F | Detalhes; nunca texto pequeno |
| `--border` | #E3E0D6 | #2A332E | Bordas |
| `--danger` | #B3261E | #F2B8B5 | Erros e alertas |

Raio de 12 px nos cartões e botões em pílula. Grade de 12 colunas, largura máxima de 1.200 px, mobile primeiro. Ícones Lucide com traço de 1,5. Fotos de pessoas reais em luz natural; **nunca** cápsula, pote, frasco ou fórmula. Elemento recorrente: linha vertical fina com pontos marcando as etapas da jornada.

## 5. Mapa do site

São 13 páginas públicas, o fluxo de 6 telas e duas áreas logadas. Rotas em português, sem dado de saúde em nenhuma URL.

| Página | Rota | Objetivo | Blocos principais |
| --- | --- | --- | --- |
| Início | `/` | Levar ao "Começar" | Hero, como funciona (4 passos), linhas de cuidado, médicos, preço da consulta, transparência, FAQ curto, CTA final |
| Como funciona | `/como-funciona` | Tirar a dúvida "vou sair com receita?" | Jornada completa, o que o médico pode decidir, livre escolha da farmácia |
| Linha de cuidado (4 páginas) | `/cabelo`, `/pele`, `/sono-e-energia`, `/suplementacao` | Página de entrada para anúncio de cada tema | Para quem é, como é a consulta, o que o médico avalia, FAQ do tema, CTA. Sem nome de ativo. |
| Preço | `/preco` | Mostrar o valor da consulta e do retorno | Consulta, retorno, o que está incluído, política de cancelamento |
| Médicos | `/medicos` | Confiança | Foto, nome, CRM/UF, RQE quando houver, formação |
| Transparência | `/transparencia` | Diferencial regulatório | CNPJ da Prumo, registro no CRM-PR, diretor técnico, como a receita funciona, farmácias, encarregado de dados |
| O que não atendemos | `/o-que-nao-atendemos` | Filtrar e proteger | Controlados, canetas emagrecedoras, hormônios para estética ou desempenho, injetáveis, menores, urgência |
| Perguntas frequentes | `/perguntas` | Objeções | 12 a 15 perguntas (seção 12) |
| Conteúdo | `/conteudo` | SEO educativo | Artigos sobre o tema, nunca sobre produto |
| Termos de uso | `/termos` | Legal | Versão e data |
| Privacidade | `/privacidade` | LGPD | Encarregado, finalidades, direitos, retenção de 20 anos do prontuário |
| Termo de consentimento da telemedicina | `/tcle` | Res. CFM 2.314/2022 | Texto versionado |
| Cancelamento e reembolso | `/cancelamento` | CDC | Prazos e regras |
| **Fluxo** | `/comecar` → `/comecar/conta` → `/comecar/triagem` → `/comecar/agenda` → `/comecar/pagamento` → `/comecar/confirmado` | Converter | Seção 6 |
| **Área do paciente** | `/minha-conta/*` | Consultas, documentos, receita | Seção 8 |
| **Painel interno** | `/painel/*` | Operação Prumo | Seção 8 |

## 6. Jornada tela a tela

Do clique em "Começar" até o retorno são 12 passos; a meta é concluir os passos 1 a 7 em menos de 6 minutos no celular. A conta é criada antes da triagem porque o consentimento para dado de saúde precisa vir antes da coleta (LGPD, art. 11).

1. **Início → "Começar".** Botão fixo no rodapé do celular. Leva a `/comecar`.
2. **Motivo da consulta.** Quatro cartões: Cabelo, Pele, Sono e energia, Suplementação. Link discreto "Não encontrou seu caso?" para `/o-que-nao-atendemos`.
3. **Conta e consentimentos.** E-mail com código de 6 dígitos (sem senha), celular, nome completo, CPF e data de nascimento. Três caixas separadas e obrigatórias: Termos de uso, Política de privacidade e "Autorizo o uso dos meus dados de saúde para o meu atendimento". Cada aceite grava versão, data, hora e IP.
4. **Elegibilidade.** Idade calculada pelo nascimento (menor de 18: bloqueio com mensagem gentil). Pergunta de sinais de urgência (seção 7): se marcar algum, a tela para e mostra SAMU 192 e o pronto-socorro mais próximo; nada é agendado.
5. **Triagem.** Perguntas comuns e da linha escolhida, uma por tela, barra de progresso, botão voltar e rascunho salvo a cada resposta. Fotos opcionais em cabelo e pele. No fim: "Pronto. Suas respostas vão para o médico antes da consulta." Nenhum resultado, nota ou sugestão.
6. **Agenda.** Próximos 14 dias em horários de 30 minutos, no fuso de Brasília, mostrando o profissional com foto, nome e CRM/UF. Opção "primeiro horário disponível". O horário fica reservado por 15 minutos.
7. **Pagamento.** Resumo (linha, data, médico, valor), aceite do TCLE da telemedicina e da política de cancelamento, Pix ou cartão em até 3x. Pix expira junto com a reserva. Cobrança só da consulta, em nome da Prumo.
8. **Confirmação.** Data, hora, como entrar e botão "Adicionar à agenda" (.ics). Lembretes por e-mail e WhatsApp 24 h e 1 h antes, sem citar o motivo da consulta.
9. **Consulta.** Botão "Entrar na consulta" ativo 10 minutos antes, que abre a sala da plataforma certificada. Até 30 minutos. Se o paciente não entrar em 10 minutos, vira "não compareceu".
10. **Depois da consulta.** Na área do paciente aparecem o resumo e os documentos que o médico emitir: receita, orientações, pedido de exame ou encaminhamento. Também existe o estado "Sem receita nesta consulta", com a orientação do médico.
11. **Tela da receita.** Título "Sua receita é sua." e dois botões de mesmo tamanho e cor:
    - **Pedir na Farmashop:** abre o site da Farmashop em nova aba, com o passo a passo para enviar a receita. A Prumo não manda nada.
    - **Baixar e levar a outra farmácia:** baixa o PDF assinado. Texto: "Qualquer farmácia de manipulação do Brasil pode fazer sua fórmula."
12. **Retorno.** Quando o médico marcar "retorno em X dias", o paciente recebe um lembrete para agendar o retorno (consulta, não compra).

**Regras de exceção:**

- Remarcar ou cancelar até 2 h antes: grátis. Depois disso, ou se o paciente não comparecer, a consulta é cobrada.
- Médico atrasado mais de 10 minutos ou ausente: remarcação prioritária ou estorno integral, à escolha do paciente.
- Médico encerra porque o caso exige atendimento presencial: consulta cobrada, encaminhamento emitido, retorno gratuito se o paciente voltar com o exame ou a avaliação.
- Pagamento recusado: horário liberado e mensagem para tentar de novo.

## 7. Formulário de triagem

A triagem é uma **anamnese para o médico ler antes da consulta**, não um questionário que decide tratamento. Ela tem regras fixas (sem IA), não calcula pontuação e não devolve nenhuma sugestão ao paciente: é isso que a separa do questionário que tirou a Voy do ar por 40 dias.

**Linhas de cuidado no lançamento** (orais e tópicos, sem controlado, sem estéril, dentro do que a Farmashop manipula hoje):

| Linha | Status | Observação |
| --- | --- | --- |
| Cabelo (queda) | Lançamento | Fotos opcionais de 3 ângulos |
| Pele (manchas, oleosidade, envelhecimento) | Lançamento | Fotos opcionais; isotretinoína oral fora (receita retida, lista C2) |
| Sono e energia | Lançamento | Sem hipnóticos controlados |
| Suplementação | Lançamento | Exames recentes em PDF são opcionais |
| Saúde sexual masculina | Fase 2 | Exige urologista; tema muito fiscalizado em anúncios |
| Mulher 40+ | Fase 2 | Exige ginecologista |
| Emagrecimento com medicamento, saúde mental, hormônios para estética ou desempenho, injetáveis | Fora | Página "O que não atendemos" |

**Bloco comum (todas as linhas)**

1. Sexo ao nascer (feminino, masculino).
2. Peso (kg) e altura (cm).
3. Está grávida, amamentando ou tentando engravidar? (só para sexo feminino; não bloqueia, vira alerta para o médico)
4. Tem ou já teve: pressão alta, doença do coração, doença do fígado, doença dos rins, diabetes, problema de tireoide, câncer, nenhuma (múltipla escolha).
5. Usa algum remédio, vitamina ou suplemento hoje? Quais? (texto livre)
6. Tem alergia a algum remédio ou substância? Qual? (texto livre)
7. Fez cirurgia ou foi internado nos últimos 6 meses?
8. **Sinais de urgência agora:** dor no peito, falta de ar, desmaio, fraqueza de um lado do corpo, sangramento que não para, nenhum. Qualquer opção diferente de "nenhum" bloqueia o fluxo e mostra SAMU 192.
9. Conte com suas palavras o que está acontecendo e o que espera da consulta. (texto livre, até 1.000 caracteres)

**Bloco por linha (exemplos para o desenvolvedor; o médico diretor técnico aprova a versão final)**

- **Cabelo:** há quanto tempo percebe a queda; onde (entradas, topo, difusa, falhas redondas); alguém da família tem calvície; coceira, descamação ou feridas no couro cabeludo; já tratou antes e com o quê (texto livre); fotos.
- **Pele:** queixa principal; há quanto tempo; usa protetor solar todo dia; usa ácidos ou cremes hoje (texto livre); tem pinta ou mancha que mudou de cor, cresceu ou sangra (sim vira alerta "avaliação presencial recomendada"); fotos.
- **Sono e energia:** horas de sono por noite; demora para dormir ou acorda à noite; alguém já disse que você ronca alto ou para de respirar dormindo; consumo de café e álcool; nas últimas duas semanas, sentiu-se para baixo ou sem esperança na maior parte dos dias.
- **Suplementação:** objetivo (energia, treino, imunidade, outro); padrão alimentar (onívoro, vegetariano, vegano); atividade física por semana; exames dos últimos 6 meses (upload opcional).

**Regras técnicas**

- Perguntas, opções, ordem e bloqueios em JSON versionado no banco (`triage_versions`), editável só pelo diretor técnico.
- Toda resposta grava a versão da triagem usada.
- Bloqueios fixos: menor de 18 e sinais de urgência. Se a resposta da pergunta de humor indicar sofrimento, mostrar acolhimento e o CVV 188 sem interromper o agendamento, e marcar alerta para o médico.
- O paciente não vê "alertas"; só o médico vê.
- Proibido: campo "qual remédio você quer?", lista de ativos, sugestão de produto ou qualquer texto do tipo "você é elegível para o tratamento X".

## 8. Área do paciente, painel interno e profissionais

São três áreas com permissões diferentes, controladas por perfil no banco (Row Level Security no Supabase). Ninguém da operação vê resposta de triagem, exceto médico e diretor técnico.

**Área do paciente (`/minha-conta`)**

| Tela | O que tem | O que não tem |
| --- | --- | --- |
| Minhas consultas | Próximas e passadas, entrar, remarcar, cancelar, agendar retorno | — |
| Documentos | Receitas, orientações, pedidos de exame e encaminhamentos, em PDF | Botão "comprar de novo" |
| Receita | Tela com os dois botões iguais (seção 6, passo 11) | Preço de fórmula, carrinho |
| Pagamentos | Recibos e nota fiscal de serviço de cada consulta | Valores de farmácia |
| Meus dados | Editar cadastro, ver e revogar consentimentos, baixar meus dados, pedir exclusão | — |
| Ajuda | Perguntas, WhatsApp de atendimento, ouvidoria | — |

Pedido de exclusão: apaga cadastro e dados de marketing; o prontuário fica guardado por 20 anos (Lei 13.787/2018), e a tela explica isso.

**Painel interno (`/painel`) — perfis e permissões**

| Perfil | Pode | Não pode |
| --- | --- | --- |
| Admin | Preços, linhas de cuidado, textos, profissionais, escala, relatórios de consultas e receita da Prumo | Ver triagem ou prontuário |
| Atendimento | Agenda, remarcar, estornar consulta, falar com paciente | Ver triagem ou prontuário |
| Diretor técnico | Tudo do admin + editar triagem, ver alertas clínicos, auditar atendimentos | — |
| Profissional | Ver a própria agenda, abrir a triagem do paciente agendado, marcar desfecho e retorno sugerido | Ver vendas, receita de farmácia ou ranking |

**Relatórios do painel:** consultas por dia e por linha, ocupação da agenda, não comparecimento, conversão por etapa do fluxo, NPS e repasse por profissional (número de atendimentos × valor fixo). É proibido criar qualquer relatório que cruze profissional ou consulta com compra em farmácia.

**Desfecho que o profissional marca** (para qualidade, não para pagamento): orientação apenas; receita emitida; pedido de exame; encaminhamento presencial; caso fora do escopo. O repasse é igual em todos.

## 9. Lado Farmashop: canal próprio para receber receitas

A Farmashop ganha uma página própria, no domínio e com o CNPJ dela, que recebe receita de **qualquer** prescritor, não só da Prumo. É um projeto separado no Lovable, com banco e conta de pagamento próprios. Esse desenho responde à pergunta 2 do checklist (08): o pedido nasce no canal da farmácia, por ação do paciente.

**Fluxo (`farmashop.com.br/enviar-receita`, endereço a confirmar):**

1. Paciente envia a receita: upload do PDF ou código de validação da receita digital.
2. Informa nome, CPF, celular, e-mail e endereço de entrega.
3. Farmacêutico da Farmashop confere a assinatura ICP-Brasil (validador do ITI) e avalia a prescrição, como faria no balcão.
4. Farmashop envia orçamento por WhatsApp ou e-mail com link de pagamento dela. O preço só existe depois da receita.
5. Pagou: manipulação, conferência, envio por Correios ou transportadora (RDC 44/2009) e código de rastreio.
6. Status do pedido numa página simples: recebido, em avaliação, aguardando pagamento, em manipulação, enviado, entregue.

**Regras do lado Farmashop**

- Nenhuma vitrine, foto, nome comercial ou preço de fórmula pronta no site (RDC 67/2007, item 5.14; Anvisa multou e suspendeu farmácias por isso em mar e abr/2026).
- Rótulo da Farmashop, com paciente, prescritor e farmacêutico (RDC 67/2007, item 12). Nunca a marca Prumo no frasco ou no sachê.
- A Farmashop não recebe resposta de triagem, prontuário nem lista de pacientes da Prumo.
- Lembrete ao cliente só sobre o pedido ("sua fórmula está acabando"); se a receita não permitir repetir, a mensagem manda falar com o médico. Nada de oferta de produto.
- Nenhum pagamento, comissão ou desconto da Farmashop para a Prumo, para médicos ou para influenciadores ligado a receitas.
- Entrega por aplicativo de terceiros só seguindo a RDC 44/2009, até a Anvisa regulamentar a Lei 15.357/2026.

**Fase 2 (só depois do parecer jurídico):** botão "Enviar para a Farmashop com 1 clique", em que o paciente autoriza o compartilhamento da receita por um token de uso único, sem dado na URL. Fica atrás de uma chave de configuração (feature flag) desligada.

**Gatilho de capacidade:** credenciar uma segunda farmácia, ou abrir filial com laboratório em SP, se o prazo para SP passar de 4 dias úteis ou se o laboratório chegar ao limite diário. Falta medir quantas fórmulas por dia a Farmashop faz hoje.

## 10. Arquitetura, integrações e modelo de dados

O Lovable constrói o que é site e fluxo; o ato médico (vídeo, prontuário e receita) roda numa plataforma de telemedicina já certificada, porque a Res. CFM 2.314/2022 exige guarda no padrão NGS2 e um prontuário feito do zero no Lovable não teria essa certificação.

**Componentes**

| Peça | Escolha | Por quê |
| --- | --- | --- |
| Front-end | Lovable: React + Vite + TypeScript + Tailwind + shadcn/ui | Padrão do Lovable; Claude Code edita o mesmo repositório no GitHub |
| Back-end | Supabase (Postgres, Auth, Storage, Edge Functions), região São Paulo (sa-east-1) | Dado de saúde no Brasil; RLS por perfil |
| Teleconsulta, prontuário e receita | Plataforma certificada SBIS/NGS2 com API ou link de sala (cotar 3) | Exigência da Res. CFM 2.314/2022 |
| Receita digital | A da plataforma, ou Memed, ou Prescrição Eletrônica do CFM (gratuita), sempre com ICP-Brasil | Validável no ITI por qualquer farmácia |
| Pagamento da consulta | Gateway brasileiro com Pix, cartão e webhook (Asaas, Pagar.me ou Mercado Pago) | Conta só da Prumo; nunca split com farmácia |
| Nota fiscal de serviço | Emissor de NFS-e via API, disparado pelo pagamento | Recibo para reembolso do plano |
| Mensagens | WhatsApp Business API oficial por um parceiro (BSP) + e-mail transacional | Lembretes sem conteúdo clínico |
| Analytics | PostHog ou Plausible no site; Meta e Google só nas páginas públicas | Nada de dado de saúde em pixel |

**Modelo de dados (Supabase)**

| Tabela | Campos principais | Quem acessa |
| --- | --- | --- |
| `profiles` | id, role (patient, staff, doctor, medical\_director, admin), nome, CPF, nascimento, celular, e-mail | Próprio usuário; admin sem CPF completo |
| `consents` | user\_id, tipo (termos, privacidade, dados\_saude, tcle, marketing), versão, aceito\_em, ip | Próprio usuário; diretor técnico |
| `care_lines` | slug, nome, status (ativa, fase2, fora), preço, triage\_version\_id | Público lê; admin edita |
| `triage_versions` | id, care\_line, json\_schema, publicado\_em, autor | Diretor técnico |
| `triage_responses` | user\_id, care\_line, version\_id, respostas (jsonb), alertas, fotos (storage privado), enviado\_em | Paciente dono, médico do agendamento, diretor técnico |
| `professionals` | user\_id, tipo (médico, nutricionista), conselho, número, UF, RQE, foto, bio, ativo | Público lê ativos |
| `availability` | professional\_id, início, fim, recorrência | Profissional e atendimento |
| `appointments` | patient\_id, professional\_id, care\_line, início, fim, status (reservado, pago, confirmado, realizado, não\_compareceu, cancelado, estornado), sala\_url, tipo (primeira, retorno) | Paciente dono, profissional, atendimento (sem triagem) |
| `payments` | appointment\_id, gateway\_id, método, valor, status, nfse\_id | Paciente dono, admin |
| `clinical_documents` | appointment\_id, tipo (receita, orientação, pedido\_exame, encaminhamento), id\_externo, pdf\_path, emitido\_em | Paciente dono, profissional autor, diretor técnico |
| `outcomes` | appointment\_id, desfecho, retorno\_sugerido\_dias | Profissional, diretor técnico |
| `payouts` | professional\_id, competência, nº atendimentos, valor\_unitário, total | Admin, o próprio profissional |
| `pharmacy_choice_events` | user\_id, documento\_id, escolha (farmashop, baixou\_pdf), em | Admin, só agregado |
| `audit_log` | quem, ação, tabela, registro, quando, ip | Diretor técnico |

Não existe tabela de pedidos de farmácia na Prumo, nem coluna que ligue `payouts` a `clinical_documents`.

**Funções no servidor (Edge Functions):** reservar horário (trava de 15 min), webhook de pagamento (confirma, emite NFS-e, dispara confirmação), lembretes (cron a cada 15 min), webhook da plataforma de telemedicina (consulta concluída, documentos emitidos), exportar meus dados, pedido de exclusão.

## 11. Segurança, LGPD e analytics

Dado de saúde é dado sensível (LGPD, art. 11): cada vazamento vira caso de ANPD, CRM e imprensa. As regras abaixo entram como critério de aceite, não como recomendação.

- **Acesso:** RLS em todas as tabelas; nenhum dado sensível lido pelo navegador sem política; MFA obrigatório para equipe e profissionais; sessão de equipe expira em 30 minutos parado.
- **Armazenamento:** fotos e PDFs em bucket privado com link assinado de 10 minutos; backups diários; região São Paulo.
- **Nada de dado de saúde em:** URL, título de página, log de erro, e-mail de marketing, template de WhatsApp, evento de analytics ou pixel. O lembrete diz "Sua consulta Prumo é amanhã às 15h", nunca o motivo.
- **Pixels:** Meta e Google só em `/`, `/como-funciona`, páginas de linha e `/preco`, depois do aceite de cookies. Dentro de `/comecar` e `/minha-conta`, só analytics próprio com eventos de etapa (ex.: `fluxo_etapa_3`), sem linha de cuidado nem respostas.
- **Banner de cookies** com "Recusar" do mesmo tamanho de "Aceitar".
- **Retenção:** prontuário e documentos clínicos por 20 anos (Lei 13.787/2018); triagem de quem não agendou apagada em 90 dias; marketing até revogação.
- **Governança:** encarregado de dados (DPO) nomeado no rodapé; relatório de impacto (RIPD) antes do lançamento; registro de auditoria de quem abriu cada triagem.
- **Farmashop:** banco separado; recebe só o que o paciente enviar; sem remarketing com dado de saúde.

## 12. Textos prontos do site

Toda a copy vende a consulta e o cuidado, nunca a fórmula: nenhum nome de ativo, nenhuma promessa de resultado, nenhuma foto de produto. O preço da consulta pode aparecer (Res. CFM 2.336/2023).

**Hero da home: três opções para teste A/B (recomendo a 1)**

| # | Título | Subtítulo |
| --- | --- | --- |
| 1 | Cabelo, pele, sono e energia: fale com um médico sem sair de casa. | Consulta por vídeo de até 30 minutos, com médico de nome e CRM na tela. Se houver indicação, a receita é sua e você escolhe a farmácia. |
| 2 | Um médico olha o seu caso. O plano é só seu. | Triagem de 5 minutos, consulta online agendada e acompanhamento. Sem fila, sem promessa milagrosa. |
| 3 | Sua saúde no prumo começa com uma conversa de 30 minutos. | Médicos identificados, receita digital válida em todo o Brasil e liberdade para escolher onde manipular. |

Botão principal: **Começar**. Abaixo dele: "Consulta a partir de R$ 99,90 · Pix ou cartão".

**Como funciona (4 passos)**

1. **Conte o que está acontecendo.** Uma triagem rápida que o médico lê antes de falar com você.
2. **Escolha o horário.** Vídeo de até 30 minutos, no dia e na hora que você preferir.
3. **Converse com o médico.** Ele avalia e decide com você o melhor caminho, que pode ou não incluir remédio.
4. **Receba seus documentos.** Receita, orientações ou pedido de exame ficam na sua conta. A farmácia, você escolhe.

**Bloco de confiança:** "Médicos com nome, foto e CRM." · "Receita digital com assinatura ICP-Brasil, aceita em todo o país." · "Você manipula onde quiser. A Farmashop, de Arapongas (PR), é uma opção integrada." · "Seus dados ficam no Brasil e não são vendidos."

**Para quem é / não é:** é para adultos que querem avaliar queda de cabelo, pele, sono, energia ou suplementação. Não é para urgências, menores de 18 anos, emagrecimento com remédio, saúde mental, hormônios para estética ou desempenho e remédios controlados.

**Perguntas frequentes**

- **Vou sair da consulta com uma receita?** Só se o médico entender que há indicação. Ele também pode orientar mudanças de hábito, pedir exames ou recomendar uma consulta presencial.
- **Posso fazer a fórmula em outra farmácia?** Pode. A receita é sua, em PDF com assinatura digital, e vale em qualquer farmácia de manipulação do Brasil.
- **Por que a Farmashop aparece no site?** Para facilitar: ela recebe sua receita, faz o orçamento e entrega em casa. Usar é opcional e não muda nada na sua consulta.
- **Quanto custa a fórmula?** Depende do que o médico prescrever. A farmácia que você escolher faz o orçamento depois de ver a receita.
- **Quem são os médicos?** Todos têm registro ativo no CRM e aparecem com nome, foto e número de registro antes do agendamento.
- **A consulta é por vídeo mesmo?** Sim, por vídeo, em ambiente seguro. Não atendemos só por chat ou questionário.
- **Vocês atendem pelo plano de saúde?** Não. Emitimos nota fiscal para você pedir reembolso, se o seu plano oferecer.
- **E se eu precisar de exame?** O médico emite o pedido digital. Você faz no laboratório que preferir, pelo plano ou particular.
- **Posso remarcar?** Sim, grátis até 2 horas antes.
- **Vocês prescrevem canetas emagrecedoras ou remédios controlados?** Não. Esses tratamentos precisam de acompanhamento que este serviço não oferece.
- **O que acontece com meus dados?** Ficam no Brasil, só o seu médico vê suas respostas de saúde, e você pode baixar ou pedir a exclusão a qualquer momento.

**Tela da receita**

> **Sua receita é sua.** Você pode manipular em qualquer farmácia do Brasil. \[Pedir na Farmashop\] \[Baixar e levar a outra farmácia\] A Farmashop é uma farmácia de manipulação de Arapongas (PR), com farmacêutico responsável. A Prumo não recebe nada pela sua escolha.

**Tela "sem receita"**

> **Seu médico não indicou remédio nesta consulta.** As orientações estão abaixo. Isso acontece em muitas consultas e é um bom sinal: tratar só quando precisa.

**Mensagens (e-mail e WhatsApp, sem conteúdo clínico)**

- Confirmação: "Consulta confirmada para {data} às {hora}, com {Dr(a). nome}. Entre pelo link 10 minutos antes: {link}."
- Lembrete 24 h e 1 h: "Sua consulta Prumo é {amanhã/em 1 hora} às {hora}. Link: {link}."
- Documentos prontos: "Seus documentos da consulta já estão na sua conta Prumo."
- Retorno: "Seu médico sugeriu um retorno por volta de {data}. Quer agendar?"

**Rodapé (obrigatório):** razão social e CNPJ da Prumo · registro no CRM-PR nº {x} · diretor técnico {nome}, CRM-PR {nº} · encarregado de dados {nome e e-mail} · links de Termos, Privacidade, TCLE, Cancelamento e Transparência.

## 13. Preço da consulta e conta por atendimento

**Recomendação: consulta a R$ 99,90 e retorno a R$ 69,90, com os dois valores editáveis no painel.** A R$ 79,90 a Prumo empata no custo direto; a R$ 99,90 sobram R$ 18,91 por consulta antes da aquisição, ou R$ 8,92 se o influenciador levar 10%.

**Premissas:** médico R$ 60 por consulta de 30 min e R$ 40 por retorno de 20 min (premissas do projeto); impostos 11% e gateway 4% (premissas do projeto; validar com o contador); tecnologia R$ 6 por consulta \[estimado: plataforma certificada, receita digital e mensagens; cotar\].

| Preço | Impostos + gateway | Médico | Tecnologia | Sobra por consulta | Sobra com 10% ao influenciador |
| --- | --- | --- | --- | --- | --- |
| Consulta R$ 79,90 | R$ 11,99 | R$ 60,00 | R$ 6,00 | R$ 1,91 | −R$ 6,08 |
| Consulta R$ 89,90 | R$ 13,49 | R$ 60,00 | R$ 6,00 | R$ 10,41 | R$ 1,42 |
| **Consulta R$ 99,90** | R$ 14,99 | R$ 60,00 | R$ 6,00 | **R$ 18,91** | **R$ 8,92** |
| Consulta R$ 119,90 | R$ 17,99 | R$ 60,00 | R$ 6,00 | R$ 35,91 | R$ 23,92 |
| **Retorno R$ 69,90** | R$ 10,49 | R$ 40,00 | R$ 6,00 | **R$ 13,41** | R$ 6,42 |

**Contra o mercado (out/2026):** consulta avulsa de pronto-atendimento sai de R$ 39,90 (ClickSaúde) a R$ 79,90 (Consulta+, por chat); Clínica Popular Online cobra R$ 59,90 e Olá Doutor, a partir de R$ 69. A R$ 99,90 a Prumo é mais cara, e a justificativa precisa estar na tela: consulta agendada, por vídeo, de até 30 minutos, focada no tema, com médico identificado.

**O que isso significa para o negócio.** Com o custo fixo do 00-CONTEXTO para os meses 1 a 6 (R$ 10,5 mil/mês: diretor técnico, sistema e conteúdo), a Prumo empata com cerca de **555 consultas/mês** sem comissão, ou **1.180/mês** com 10% de influenciador, sem contar a mensalidade da plataforma certificada. São 25 a 54 consultas por dia útil.

O lucro das fórmulas (sobra de R$ 11 a R$ 40 por pedido, pelos custos que você passou) é da Farmashop e não pode voltar para a Prumo, nem como desconto na consulta. Por isso:

- Comissão de influenciador **só sobre a consulta**, nunca sobre a fórmula.
- Nada de "consulta grátis" ou "consulta abatida na fórmula": isso é venda casada e captação de receita.
- O caminho para a Prumo se pagar sozinha é o retorno e, depois, a assinatura de acompanhamento dos planos v5. Este site funciona como porta de entrada desses planos.

Rodar o cenário completo na skill de modelo financeiro com o custo real da plataforma certificada antes de fechar o preço.

## 14. Prompts prontos para Lovable e CLAUDE.md para Claude Code

Use em sequência: um prompt por vez no Lovable, testando cada etapa antes da próxima. Conecte o Supabase (região São Paulo) e o GitHub no Lovable antes do prompt 2; o Claude Code trabalha no mesmo repositório, lendo o CLAUDE.md da raiz.

**Prompt 1 — Base e páginas públicas**

```markdown
Crie o site da Prumo, clínica de telemedicina (empresa de serviços médicos), em português do Brasil, mobile first, com React, TypeScript, Tailwind e shadcn/ui.

Marca: Prumo — "Sua saúde no prumo". Tom claro, calmo e adulto. Fontes Google: Fraunces 600 nos títulos, Inter no texto. Tokens CSS (claro/escuro): --bg #F7F5EF/#121714, --surface #FFFFFF/#1A211D, --ink #1F2A24/#EEF1EC, --muted #5E6B64/#A3AEA8, --primary #2F5D50/#7FB8A4, --primary-soft #DCE8E2/#24362F, --accent #C8873A/#D9A35F (só detalhes), --border #E3E0D6/#2A332E, --danger #B3261E/#F2B8B5. Raio 12px, botões em pílula, ícones Lucide. Elemento gráfico: linha vertical fina com pontos marcando etapas.

Páginas: / (hero, como funciona em 4 passos, 4 linhas de cuidado, médicos, preço, transparência, FAQ curto, CTA), /como-funciona, /cabelo, /pele, /sono-e-energia, /suplementacao, /preco, /medicos, /transparencia, /o-que-nao-atendemos, /perguntas, /conteudo, /termos, /privacidade, /tcle, /cancelamento. Botão principal "Começar" leva a /comecar e fica fixo no rodapé no celular.

Use exatamente os textos que vou colar a seguir. Rodapé com razão social, CNPJ, registro no CRM-PR, diretor técnico com CRM e encarregado de dados (placeholders editáveis).

RESTRIÇÕES OBRIGATÓRIAS: nunca mostrar nome de remédio, ativo, fórmula, dose, cápsula, pote ou frasco; nunca prometer resultado; não criar loja, carrinho ou preço de medicamento. O site vende só a consulta. Imagens: pessoas reais em luz natural.
```

**Prompt 2 — Banco, login e consentimentos**

```markdown
No Supabase, crie as tabelas: profiles (role: patient, staff, doctor, medical_director, admin), consents, care_lines, triage_versions, triage_responses, professionals, availability, appointments, payments, clinical_documents, outcomes, payouts, pharmacy_choice_events, audit_log — com os campos do briefing (seção 10). Ative RLS em todas, com estas regras: paciente só vê o que é dele; staff não lê triage_responses nem clinical_documents; doctor só lê a triagem dos pacientes com agendamento com ele; medical_director lê tudo e edita triage_versions. Não crie nenhuma coluna ou view que ligue payouts a clinical_documents ou a farmácia.

Login por e-mail com código de 6 dígitos (sem senha). Cadastro: nome, CPF (validar dígitos), nascimento, celular. Três aceites separados e obrigatórios (termos, privacidade, dados_saude) gravando versão, data/hora e IP em consents. MFA obrigatório para staff, doctor, medical_director e admin. Bucket privado para fotos e PDFs, com URL assinada de 10 minutos.
```

**Prompt 3 — Fluxo /comecar e triagem**

```markdown
Crie o fluxo /comecar em etapas com barra de progresso, botão voltar e rascunho salvo a cada resposta: 1) motivo (4 cartões vindos de care_lines ativas); 2) conta e consentimentos; 3) elegibilidade: bloqueia menor de 18 anos e, se houver sinal de urgência, mostra tela com SAMU 192 e encerra; 4) triagem renderizada a partir do JSON da triage_versions publicada (tipos: escolha única, múltipla, número, texto até 1000 caracteres, upload de até 3 fotos). Grave as respostas com version_id.

A triagem não usa IA, não calcula pontuação e não mostra resultado. Ao final mostre apenas: "Pronto. Suas respostas vão para o médico antes da consulta." Alertas (gestação, pinta que mudou, ronco com pausas, humor baixo) são salvos em triage_responses.alertas e só o médico vê. Se o humor indicar sofrimento, mostre uma mensagem acolhedora com CVV 188 e permita continuar.

Proibido: campo "qual remédio você quer", lista de ativos, sugestão de produto ou frase "você é elegível para".
```

**Prompt 4 — Agenda, pagamento e confirmação**

```markdown
Crie /comecar/agenda com os próximos 14 dias em horários de 30 minutos (fuso America/Sao_Paulo), mostrando foto, nome e CRM/UF do profissional, e a opção "primeiro horário disponível". Ao escolher, uma Edge Function reserva o horário por 15 minutos.

/comecar/pagamento: resumo, aceite do TCLE e da política de cancelamento (gravar em consents), Pix ou cartão até 3x por um gateway brasileiro via Edge Function com webhook. Preço lido de care_lines (consulta 99,90; retorno 69,90). A cobrança é só da consulta, em nome da Prumo.

Webhook pago: appointment = confirmado, emitir NFS-e (stub de integração), enviar e-mail e WhatsApp de confirmação com .ics. Cron a cada 15 min envia lembretes 24h e 1h antes. Nenhuma mensagem cita motivo, linha de cuidado ou sintoma. Regras: remarcar ou cancelar grátis até 2h antes; depois disso ou não comparecimento, cobrado.
```

**Prompt 5 — Área do paciente e tela da receita**

```markdown
Crie /minha-conta com: Minhas consultas (entrar, remarcar, cancelar, agendar retorno), Documentos, Pagamentos (recibos e NFS-e), Meus dados (editar, consentimentos, baixar meus dados, pedir exclusão — explicar que o prontuário fica guardado 20 anos), Ajuda.

O botão "Entrar na consulta" fica ativo 10 minutos antes e abre a sala da plataforma de telemedicina (URL em appointments.sala_url). Um webhook da plataforma marca a consulta como realizada e cria clinical_documents com o PDF.

Tela de receita com o título "Sua receita é sua." e DOIS BOTÕES DE MESMO TAMANHO, COR E PESO: "Pedir na Farmashop" (abre o site da Farmashop em nova aba; não envia nada) e "Baixar e levar a outra farmácia" (baixa o PDF). Texto: "Você pode manipular em qualquer farmácia do Brasil. A Prumo não recebe nada pela sua escolha." Registre o clique em pharmacy_choice_events. Crie também o estado "Sem receita nesta consulta". Nunca mostrar preço de fórmula ou botão de compra.
```

**Prompt 6 — Painel interno e profissionais**

```markdown
Crie /painel com permissões por role. Admin: preços e textos de care_lines, cadastro de profissionais, escala, relatórios (consultas por dia e linha, ocupação, não comparecimento, conversão por etapa, NPS, repasse = nº de atendimentos realizados × valor fixo). Staff: agenda, remarcar, estornar, contato. Doctor: a própria agenda, a triagem do paciente agendado (somente leitura), marcar desfecho (orientação, receita emitida, pedido de exame, encaminhamento, fora do escopo) e retorno sugerido em dias. Medical_director: tudo + editor de triage_versions com versionamento + auditoria.

Proibido criar qualquer relatório que cruze profissional ou consulta com receita emitida para fins de pagamento, ou com compra em farmácia. Registre em audit_log toda abertura de triagem.
```

**Prompt 7 — Projeto separado da Farmashop (outro projeto no Lovable, outro Supabase)**

```markdown
Crie para a Farmashop, farmácia de manipulação de Arapongas (PR), a página /enviar-receita, com a identidade visual da Farmashop. O cliente envia a receita (upload de PDF ou código de validação), nome, CPF, celular, e-mail e endereço. O farmacêutico vê os pedidos num painel, confere a assinatura no validador do ITI, registra o orçamento e envia link de pagamento da própria Farmashop por WhatsApp ou e-mail. Status: recebido, em avaliação, aguardando pagamento, em manipulação, enviado, entregue, com código de rastreio.

Aceita receita de qualquer prescritor. Proibido: vitrine, catálogo, foto ou preço de fórmula pronta, nome comercial de fórmula, marca de terceiros no rótulo. Rodapé com razão social, CNPJ, licença sanitária e farmacêutico responsável com CRF.
```

**CLAUDE.md (raiz do repositório da Prumo)**

```markdown
# Prumo — regras do projeto

Produto: clínica de telemedicina. Vende consulta por vídeo de até 30 min. O médico decide se prescreve. A Farmashop é outra empresa e uma opção de farmácia, nunca a única.

## Restrições que nenhum código pode violar
1. Nunca exibir, sugerir ou armazenar catálogo de remédio, ativo, fórmula ou dose. A triagem não tem IA, pontuação nem resultado.
2. A tela da receita sempre tem dois botões equivalentes: "Pedir na Farmashop" e "Baixar e levar a outra farmácia". A Prumo nunca envia receita a farmácia.
3. O checkout cobra só consulta. Nenhum preço de fórmula, carrinho, cupom de farmácia ou consulta grátis condicionada a compra.
4. Repasse ao profissional = atendimentos realizados × valor fixo. Nenhuma tabela, view ou relatório liga pagamento a receita ou a farmácia.
5. Dado de saúde nunca em URL, log, analytics, pixel, e-mail de marketing ou template de WhatsApp.
6. RLS em todas as tabelas. Staff não lê triagem nem documento clínico.
7. Toda mudança em textos de marketing passa pela checklist: sem ativo, sem promessa, sem foto de produto.

## Stack
React + Vite + TS + Tailwind + shadcn/ui · Supabase (sa-east-1) · Edge Functions para reserva, pagamento, lembretes e webhooks · plataforma de telemedicina certificada NGS2 via webhook.

## Testes obrigatórios antes de cada deploy
- Menor de 18 e sinal de urgência bloqueiam o fluxo.
- Paciente A não lê dados do paciente B (testar RLS).
- Staff recebe 403 ao abrir triage_responses.
- Os dois botões da receita têm o mesmo componente e as mesmas props de estilo.
- Busca no código por nomes de ativos comuns e por "carrinho" retorna zero no front-end público.
```

## 15. Critérios de aceite e checklist de lançamento

O site só vai ao ar quando todos os itens técnicos passarem e os itens legais estiverem assinados. Metas de produto do piloto: fluxo concluído em menos de 6 minutos, conversão de "Começar" para consulta paga acima de 15%, não comparecimento abaixo de 10% e NPS acima de 60 \[metas propostas; ajustar com dados reais\].

**Técnico (testar antes de publicar)**

- [ ] Menor de 18 anos e sinal de urgência bloqueiam o fluxo, com SAMU 192 visível.
- [ ] Paciente A não acessa nenhum dado do paciente B (teste de RLS em todas as tabelas).
- [ ] Staff recebe erro ao abrir triagem ou documento clínico.
- [ ] Reserva de horário expira em 15 minutos e não permite dois pacientes no mesmo horário.
- [ ] Webhook de pagamento confirma a consulta, emite NFS-e e dispara a confirmação.
- [ ] Lembretes chegam 24 h e 1 h antes, sem citar motivo.
- [ ] Tela da receita: os dois botões usam o mesmo componente e estilo; o PDF baixa; nada é enviado à Farmashop.
- [ ] Busca no código público por nomes de ativos, "carrinho" e "comprar fórmula" retorna zero.
- [ ] Pixels de anúncio não carregam em `/comecar` nem em `/minha-conta`.
- [ ] Lighthouse no celular: desempenho acima de 85 e acessibilidade acima de 95; contraste AA em todos os textos.

**Legal e operação (antes da primeira consulta paga)**

- [ ] Parecer jurídico (direito sanitário e médico) sobre a estrutura das duas empresas, o botão da Farmashop e a remuneração de influenciadores.
- [ ] Prumo com CNPJ, registro no CRM-PR e diretor técnico nomeado.
- [ ] Contrato com a plataforma de telemedicina certificada (NGS2) e teste da receita digital no validador do ITI.
- [ ] Contratos com profissionais: valor fixo por consulta, termo de independência, sem vínculo com a Farmashop.
- [ ] Termos, Privacidade, TCLE e política de cancelamento revisados pelo advogado e publicados com versão.
- [ ] Encarregado de dados nomeado e relatório de impacto (RIPD) feito.
- [ ] Triagem final aprovada pelo diretor técnico.
- [ ] Farmashop: página própria no ar, fluxo de avaliação de receita digital e de envio testado com a vigilância sanitária local.
- [ ] Marca Prumo depositada no INPI e domínio registrado.
- [ ] Manual de comunicação para influenciadores (pode / não pode), aprovado pelo jurídico.

## 16. Próximos passos

A ordem importa: o jurídico e a plataforma certificada definem o que o Lovable vai integrar, então começam juntos com a construção das páginas públicas.

| Semana | O quê | Responsável |
| --- | --- | --- |
| 1 | Contratar o parecer jurídico com as 4 perguntas do checklist (08) + remuneração de influenciador só sobre consulta | João |
| 1 | Pedir demonstração e preço a 3 plataformas de telemedicina certificadas (NGS2) com API ou link de sala | João |
| 1 | Depositar Prumo no INPI e registrar o domínio | João |
| 1–2 | Rodar os prompts 1 e 2 no Lovable (páginas públicas e banco) | Desenvolvimento |
| 2 | Medir quantas fórmulas por dia a Farmashop faz hoje e o prazo real para SP | Farmashop |
| 2–3 | Fechar médico diretor técnico e 3 médicos a R$ 60 por consulta | João |
| 3–4 | Prompts 3 a 6 (fluxo, agenda, pagamento, área do paciente, painel) e integração com a plataforma escolhida | Desenvolvimento |
| 3–4 | Prompt 7: página da Farmashop, no CNPJ dela | Farmashop |
| 5 | Teste fechado com 20 pacientes da base da Farmashop, convidados sem promessa de remédio | João |
| 6 | Revisar preço e conversão; só então ligar influenciadores e mídia paga | João |

**Pendências que mudam o briefing:** custo mensal da plataforma certificada (muda a seção 13); resposta do advogado sobre o botão "Pedir na Farmashop" (pode exigir só o link genérico do site da farmácia); quem é dono de cada empresa, porque sócio comum nas duas é a zona cinzenta que o parecer precisa responder primeiro.

## 17. Fontes

Páginas consultadas em 19/10/2026, mais os arquivos do projeto: 00-CONTEXTO (dossiê), 07-modelo v4, 08-checklist farmácia única, 09 e 10 (business plans v4 e v5), 14 (nome no sachê), 17 (e-commerce e quiz) e 19 (prescrição farmacêutica).

**Regras**

- [Res. CFM 2.314/2022 — resumo da telemedicina (Academia Médica)](https://academiamedica.com.br/blog/saiba-o-que-diz-a-nova-resolucao-do-cfm-que-regulamenta-a-telemedicina-no-brasil)
- [CFM normatiza o uso da IA na medicina — Res. CFM 2.454/2026](https://portal.cfm.org.br/noticias/cfm-normatiza-uso-da-ia-na-medicina/)
- [Res. CFM 2.454/2026 — texto (LegisWeb)](https://www.legisweb.com.br/legislacao/?id=491437)
- [Res. CFM 2.336/2023 — publicidade médica e preço da consulta (Cremers)](https://cremers.org.br/novas-regras-da-publicidade-medica-entram-em-vigor)
- [CRF-SP — intermediação de fórmulas e captação de receitas (RDC 67/2007)](https://crfsp.org.br/images/2023/OrientacaoFarmaceutica/Parte_2/Intermediao_de_frmulas_captao_de_receitas.pdf)
- [Anvisa — perguntas e respostas da RDC 1.000/2025](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/medicamentos/controlados/perguntas-e-respostas-rdc-1000-2025-1-ed.pdf)
- [Prescrição Eletrônica do CFM](https://prescricaoeletronica.cfm.org.br/)
- [Lei 15.357/2026 e o processo de regulamentação da Anvisa (Cescon Barrieu)](https://cesconbarrieu.com.br/anvisa-inicia-processo-para-regular-a-venda-de-medicamentos-em-plataformas-digitais/)
- [Anvisa esclarece revogação de medidas contra plataformas digitais (Abcfarma, 10/08/2026)](https://site.abcfarma.org.br/anvisa-esclarece-revogacao-de-medidas-contra-plataformas-digitais/)

**Fiscalização de 2026**

- [Anvisa proíbe venda e propaganda de farmácias de manipulação — REs 1.683 e 1.684/2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-proibe-venda-e-propaganda-de-produtos-de-farmacias-de-manipulacao)
- [Anvisa adota medidas contra quatro farmácias de manipulação — REs 808, 849 e 885/2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-adota-medidas-contra-quatro-farmacias-de-manipulacao)
- [Anvisa proíbe a plataforma Voy (Correio da Manhã, jun/2026)](https://www.correiodamanha.com.br/colunistas/rudolfo-lago/2026/06/297332-anvisa-proibe-plataforma-de-consulta-online.html)
- [Anvisa revoga a proibição da Voy (Jornal de Brasília, 05/08/2026)](https://jornaldebrasilia.com.br/noticias/saude/anvisa-revoga-proibicao-da-plataforma-de-emagrecimento-voy/)

**Preços de consulta online**

- [ClickSaúde](https://assine.clicksaude.com.br/)
- [Clínica Popular Online](https://www.clinicapopularonline.com.br/)
- [Olá Doutor](https://oladoutor.app/)
- [Consulta+](https://consultamais.app/)
