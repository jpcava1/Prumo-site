# Prumo — regras do projeto (leia antes de qualquer mudança)

Produto: site da **Prumo**, clínica de telemedicina (empresa A, registro no CRM-PR). Vende **só a consulta** por vídeo, de até 30 min. O médico decide se prescreve. A **Farmashop** (farmácia de manipulação de Arapongas/PR) é **outra empresa** e aparece apenas como uma opção de farmácia, com o mesmo peso de "levar a receita a outra farmácia".

Briefing completo: `docs/BRIEFING.md`.

## Restrições que nenhum código pode violar

1. **Nada de remédio nas páginas públicas.** Nunca exibir, sugerir ou anunciar remédio, ativo, fórmula, dose ou preço de fórmula ao público. Nada de carrinho e nada de preço de fórmula em lugar nenhum. A triagem não tem IA, pontuação nem resultado; só alertas para o médico. (Caso Voy, Anvisa jun–ago/2026; RDC 67/2007 item 5.14.)
   - **Exceção decidida pelo João (2026-10-20), pendente de parecer jurídico:** o médico tem uma **tabela de ativos privada** (`doctor_actives`, só ele lê) e monta a receita durante a consulta (`prescriptions`, `src/pages/panel/DoctorPrescription.tsx`). O paciente vê os componentes da **própria** receita emitida, na área logada, sem preço. Nenhum nome real de ativo no código (os testes de conformidade continuam valendo); os nomes ficam só no banco, cadastrados pelo médico.
2. **Livre escolha da farmácia.** A tela da receita (`src/components/PharmacyChoice.tsx`) tem duas opções com o MESMO componente e estilo: "Pedir na Farmashop" (só abre o WhatsApp dela, +55 43 98825-1010, em nova aba, com mensagem pronta sem dado de saúde) e "Salvar receita e levar a outra farmácia". A Prumo nunca envia receita ou dado do paciente para farmácia. (CEM arts. 68 e 69; RDC 67/2007, captação de receitas.)
3. **Checkout só da consulta**, na conta da Prumo. Sem split, sem cupom de farmácia, sem "consulta grátis comprando a fórmula".
4. **Médico pago por consulta realizada × valor fixo.** Nenhuma tabela, coluna, view ou relatório liga pagamento de profissional a receita, documento ou farmácia.
5. **Dado de saúde** nunca em URL, título, log, analytics, pixel, e-mail de marketing ou template de WhatsApp. Motivo da consulta passa por estado da navegação, não por query string.
   - **Exceção decidida pelo João (2026-10-22), pendente de parecer jurídico:** ao encerrar a consulta, a função `send-documents` manda ao e-mail do **próprio paciente** os PDFs do Seu Plano e da receita como anexos. O texto do e-mail continua neutro (sem motivo, remédio ou farmácia).
6. **RLS em todas as tabelas.** Staff e admin não leem `triage_responses`, `clinical_documents`, `prescriptions` nem `doctor_actives`. Médico lê triagem só pela função `get_triage_for_appointment` (que audita).
7. **Quem prescreve:** só profissional com CRM (medicamento) ou CRN (suplemento). Nunca farmacêutico da Farmashop, biomédico ou estudante.
8. **Copy:** sem promessa de resultado, sem antes/depois de tratamento, sem foto de cápsula/pote/frasco. Preço da consulta pode aparecer (Res. CFM 2.336/2023). Especialidade só com RQE.
9. **Menores de 18 anos e sinais de urgência** bloqueiam o fluxo (com SAMU 192).

Se um teste de `tests/compliance.test.ts`, `tests/pharmacy-choice.test.tsx`, `tests/db/rls.test.ts`, `tests/db/prescriptions.test.ts` ou `tests/db/care-plan.test.ts` falhar, **conserte o código, não o teste**. Mudar uma dessas regras exige decisão do João e parecer jurídico.

## Stack

- React 18 + Vite + TypeScript + Tailwind (tokens em `src/index.css`, identidade "Prumo premium": azul Cosmos #003049, vermelho Crimson #C1121F, creme #FDF0D5).
- Supabase (região São Paulo): Postgres + Auth (e-mail e senha) + Storage privado + Edge Functions (Deno).
- Login: "Login" no topo abre pop-up com "Médico / Nutricionista" ou "Paciente" (`src/components/LoginChooser.tsx`).
- Profissional se cadastra pelo site (`/profissional/cadastro`, função `register_professional`) e fica **pendente** até a equipe aprovar em `/painel/profissionais` (conferir CRM/CRN). Ele abre horários por dia em `/painel/horarios` (`availability_dates`); `available_slots` só mostra profissional aprovado e ativo. Nutricionista atende só a linha de suplementação.
- "Seu Plano" (`care_plans`, documento `plano`) é separado da receita: objetivos, metas, cardápio (nutricionista), rotina, cuidados (médico) e exames. O profissional monta na consulta com itens da biblioteca dele (`plan_templates`, `/painel/ativos`) ou das sugestões em `src/content/planSuggestions.ts`. Os dois PDFs saem de `supabase/functions/_shared/documentsPdf.ts` (mesmo código no site e no e-mail). O Seu Plano nunca leva componentes nem doses.
- Camada de dados única: `src/lib/api/` com duas implementações da mesma interface (`types.ts`):
  - `supabaseApi.ts` (produção) e `demoApi.ts` (modo demonstração em memória, sem chaves).
- Banco: `supabase/migrations/*.sql`. Seed gerado de `src/content` com `npm run seed:triage`.
- Pagamento: Asaas (função `create-payment` + `payment-webhook`). Telemedicina: adaptador `supabase/functions/_shared/telemed.ts` (plataforma NGS2 ainda a escolher).

## Comandos

```
npm run dev          # site em http://localhost:8080 (modo demonstração se não houver .env.local)
npm test             # todos os testes, inclusive banco (PGlite) e conformidade
npm run test:db      # só os testes de banco/RLS
npm run typecheck
npm run build
npm run seed:triage  # regenera supabase/seed.sql depois de mudar src/content
```

## Antes de cada commit

- `npm run check` passa (typecheck + testes + build).
- Mudou texto legal? Suba a versão em `src/config/site.ts` (`legalVersions`).
- Mudou triagem em `src/content/triage`? Rode `npm run seed:triage`. Em produção, triagem nova é publicada pelo diretor técnico no painel (`/painel/triagem`), não por migration.
- Mudou o banco? Crie uma NOVA migration (nunca edite uma já aplicada) e adicione teste em `tests/db/`.

## Pendências conhecidas (TODO)

- `src/config/site.ts`: dados reais da empresa ([PREENCHER]).
- Textos legais em `src/pages/public/Legal.tsx`: revisão do advogado.
- `supabase/functions/_shared/telemed.ts`: integrar a plataforma de telemedicina escolhida.
- `payment-webhook`: emissão de NFS-e (código de serviço com o contador).
- `_shared/messages.ts`: formato do parceiro de WhatsApp (BSP) e templates aprovados pela Meta.
- Analytics próprio em `src/lib/analytics.ts` (PostHog/Plausible), respeitando `adPixelsAllowed`.
