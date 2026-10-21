# Prumo — site da consulta online

Site da Prumo: o paciente escolhe o motivo, cria a conta, responde a triagem, agenda uma consulta por vídeo de até 30 minutos e paga só a consulta. Se o médico indicar fórmula manipulada, a receita é do paciente e ele escolhe a farmácia; a Farmashop aparece como opção integrada.

> Regras do projeto (o que o código nunca pode fazer): [`CLAUDE.md`](CLAUDE.md). Briefing completo: [`docs/BRIEFING.md`](docs/BRIEFING.md).

## O que já está pronto

| Parte | O que faz |
| --- | --- |
| Páginas públicas | Início, como funciona, 4 linhas de cuidado, preço, médicos, transparência, o que não atendemos, perguntas, conteúdo e 4 textos legais (rascunho) |
| Fluxo `/comecar` | Motivo → conta (código por e-mail, CPF, autorizações) → triagem versionada → horário → pagamento → confirmação |
| Área do paciente | Consultas (entrar, remarcar, cancelar, retorno), documentos, tela da receita com livre escolha da farmácia, pagamentos, baixar/excluir dados |
| Painel | Agenda da equipe, agenda do médico com triagem e desfecho, profissionais e horários, linhas e preços com a conta por consulta, editor de triagem do diretor técnico, relatórios, acessos |
| Banco | 16 tabelas com RLS, reserva de horário sem conflito, cancelamento grátis até 2 h, auditoria de quem abriu cada triagem, repasse = consultas realizadas × valor fixo |
| Funções de servidor | Cobrança no Asaas, webhook de pagamento, lembretes 24 h e 1 h, webhook da telemedicina (documentos), exportação de dados (LGPD) |
| Testes | 79 testes: regras do banco e RLS, triagem, agenda, conta por consulta, LGPD, tela da receita e varredura de conformidade do texto |

Sem as chaves do Supabase, o site sobe em **modo demonstração**: dados fictícios em memória, crie uma conta com qualquer e-mail e senha, botões para simular pagamento, consulta e aprovação de profissional. Serve para ver tudo funcionando antes de ligar o banco.

## Passo a passo

### 1. Ver o site na sua máquina (10 minutos)

Precisa do [Node.js 20 ou mais novo](https://nodejs.org).

```bash
npm install
npm run dev
```

Abra http://localhost:8080. No modo demonstração, clique em "Login" e crie uma conta com qualquer e-mail e senha. No painel (`/painel`) há um seletor para trocar de papel (paciente, equipe, médico, diretor técnico, admin).

### 2. Subir no GitHub

1. Crie um repositório **privado** no GitHub (ex.: `prumo-site`).
2. A pasta já vem com o histórico do Git e um primeiro commit. Nesta pasta:

```bash
git remote add origin https://github.com/SEU-USUARIO/prumo-site.git
git push -u origin main
```

(Se a pasta chegou sem a subpasta oculta `.git`, rode antes: `git init && git add . && git commit -m "Prumo: site inicial" && git branch -M main`.)

O GitHub roda os testes sozinho a cada envio (`.github/workflows/ci.yml`).

### 3. Trabalhar com o Claude Code

No terminal, dentro da pasta do projeto:

```bash
claude
```

O Claude Code lê o `CLAUDE.md` e respeita as regras. Exemplos de pedido:

- "Preencha `src/config/site.ts` com estes dados da empresa: …"
- "Integre a plataforma de telemedicina X em `supabase/functions/_shared/telemed.ts` usando a documentação: …"
- "Configure a linha Suplementação para ser atendida por nutricionista."
- "Rode `npm run check` e corrija o que falhar."

### 4. Ligar o Supabase (banco, login e arquivos)

1. Crie um projeto em [supabase.com](https://supabase.com), região **South America (São Paulo)**.
2. Instale a [CLI do Supabase](https://supabase.com/docs/guides/cli) e, nesta pasta:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push                  # cria tabelas, regras de acesso e buckets
```

Depois, abra o **SQL Editor** do Supabase, cole o conteúdo de `supabase/seed.sql` e rode (cria as 4 linhas de cuidado com preço e a triagem v1).

3. Em **Authentication → Providers → Email**: deixe o login por e-mail e senha ativo (senha mínima de 8 caracteres). Se ligar "Confirm email", a pessoa precisa clicar no link antes do primeiro login. Em **URL Configuration**, coloque o endereço do site para o link de "Esqueci minha senha".
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (em Project Settings → API).
5. Rode `npm run dev` de novo: o aviso de demonstração some.
6. Crie seu usuário entrando no site e, no SQL Editor, torne-se admin:

```sql
update public.profiles set role = 'admin' where email = 'seu@email.com';
```

Depois, pelo painel (`/painel/acessos`), dê os papéis `medical_director` ao diretor técnico e `doctor` aos médicos (cada um precisa entrar no site uma vez antes).

### 5. Pagamento, lembretes e telemedicina (funções de servidor)

```bash
supabase secrets set ASAAS_API_KEY=... ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3 ASAAS_WEBHOOK_TOKEN=... \
  CRON_SECRET=... TELEMED_WEBHOOK_SECRET=... SITE_URL=https://seudominio.com.br \
  RESEND_API_KEY=... EMAIL_FROM="Prumo <consultas@seudominio.com.br>" \
  COMPANY_LEGAL_NAME="Prumo Serviços Médicos Ltda." COMPANY_CNPJ="00.000.000/0001-00"

supabase functions deploy create-payment
supabase functions deploy export-my-data
supabase functions deploy send-documents
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy send-reminders --no-verify-jwt
supabase functions deploy telemed-webhook --no-verify-jwt
```

- **Asaas** (conta no CNPJ da Prumo): cadastre o webhook `https://SEU_PROJECT_REF.supabase.co/functions/v1/payment-webhook` com o mesmo token de `ASAAS_WEBHOOK_TOKEN`. Teste no sandbox antes de trocar para produção.
- **Lembretes**: rode `supabase/cron.sql` no SQL Editor (troque o project ref e o segredo).
- **Telemedicina**: escolha a plataforma certificada (NGS2), implemente `createRoom` em `supabase/functions/_shared/telemed.ts` e configure o webhook dela para `.../functions/v1/telemed-webhook` com assinatura HMAC.
- **WhatsApp**: ajuste `sendWhatsApp` ao formato do parceiro oficial (BSP) e use templates aprovados pela Meta.

### 6. Publicar

Na [Vercel](https://vercel.com) ou na [Netlify](https://netlify.com): importe o repositório do GitHub, comando `npm run build`, pasta `dist`, e as variáveis `VITE_*` do `.env.local`. Para as rotas funcionarem, já existem `vercel.json` e `public/_redirects`.

### E o Lovable?

Opcional, para ajustes visuais. O Lovable funciona melhor com projetos criados nele e sincronizados com o GitHub; confira se ele importa um repositório existente. Se importar, conecte este repositório e peça só mudanças de texto e layout. Se não importar, use-o para testar ideias de tela e peça ao Claude Code para aplicar aqui. Em qualquer caso, rode `npm test` depois: os testes de conformidade pegam texto proibido.

## Antes de abrir para pacientes

- [ ] Parecer jurídico sobre as duas empresas, o botão da Farmashop e a remuneração de influenciadores
- [ ] Prumo com CNPJ, registro no CRM-PR e diretor técnico; dados em `src/config/site.ts`
- [ ] Textos legais revisados pelo advogado (`src/pages/public/Legal.tsx`)
- [ ] Triagem aprovada pelo diretor técnico
- [ ] Plataforma de telemedicina NGS2 integrada e receita testada no validador do ITI
- [ ] Asaas em produção, NFS-e configurada com o contador
- [ ] Encarregado de dados nomeado e relatório de impacto (RIPD)
- [ ] Página da Farmashop para receber receitas no ar (projeto separado, CNPJ dela)
- [ ] Marca Prumo depositada no INPI e domínio registrado

## Estrutura

```
src/
  config/site.ts          dados da empresa, políticas, versões dos textos legais
  content/                textos das linhas, perguntas frequentes, triagem v1, gerador do seed
  lib/api/                interface de dados + Supabase + modo demonstração
  lib/triage/             esquema (zod) e motor da triagem (sem IA)
  lib/schedule.ts         horários (fuso de Brasília), cancelamento, entrada na sala
  lib/pricing.ts          conta por consulta
  lib/analytics.ts        regras de pixel e eventos sem dado de saúde
  components/             UI, layout, tela da receita (PharmacyChoice)
  pages/public|flow|account|panel
supabase/
  migrations/             esquema, funções e RLS, storage
  functions/              create-payment, payment-webhook, send-reminders, telemed-webhook, export-my-data
  seed.sql                linhas de cuidado e triagem v1 (gerado)
  cron.sql                agendamento dos lembretes
tests/                    unidade, interface, conformidade e banco (PGlite)
docs/BRIEFING.md          briefing completo do projeto
```
