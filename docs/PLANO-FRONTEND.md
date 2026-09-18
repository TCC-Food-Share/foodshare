# Plano de implementação do Frontend (MVP)

Documento de continuidade: descreve as fases do frontend, o que cada uma
constrói, e o que **remover** do protótipo Pencil por estar fora do escopo
do MVP. A fonte da verdade é sempre `docs/REQUISITOS.md` — este arquivo só
organiza a execução.

> **Regra**: toda tela construída deve ficar 100% alinhada aos RF do MVP.
> Telas e elementos marcados como "fora do escopo" **não** viram código.

## Stack (decidida no F0)

- React 19 + TypeScript + **Vite 7** (`@vitejs/plugin-react` 5 + React Compiler).
  **Não subir** vite / plugin-react (bug ARM64 do Rolldown no Coolify — `docs/INFRAESTRUTURA.md`).
- **Tailwind v4** via `@tailwindcss/vite` (sem `tailwind.config.js` / `postcss`).
- **shadcn/ui** — componentes em `frontend/src/components/ui/`; tokens em
  `frontend/src/styles/index.css` (portados do protótipo = shadcn default Neutral).
- **react-router-dom** (roteamento), **@tanstack/react-query** (cache/paginação/mutations),
  **react-hook-form + zod** (formulários; schemas espelham os DTOs `class-validator` do backend).
- Cliente HTTP: `frontend/src/lib/api.ts` (`ApiError` tipado com `status`, `credentials: 'include'`).
- Auth: `frontend/src/features/auth/` (`AuthProvider`, `useAuth`, `ProtectedRoute`, `RoleRoute`).
- Organização por feature/tela (`docs/CONVENCOES.md`). Código/rotas/DTO em inglês; texto de UI em pt-BR.

## Estado atual

| Fase   | Escopo                                                                                                                  | Status                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **F0** | Fundação (deps, tokens, HTTP, auth, layout, roteamento com stubs) + backend `GET /me` retorna `role` + `trustedOrigins` | ✅ feito, merge em `develop` (`chore/frontend-fundacao`)                   |
| F1     | Login + erro genérico (RF08) + logout (RF09) + tokens no accent azul + logo/favicon                                     | ✅ feito, merge em `develop` (`feat/rf07-login`)                           |
| F2     | Cadastro multi-etapa (estabelecimento + entidade)                                                                       | ✅ feito, merge em `develop` (`feat/rf01-cadastro`)                        |
| F3     | Edição de perfil (campos travados RF06)                                                                                 | ✅ feito, merge em `develop` (`feat/rf05-edicao-perfil`)                   |
| F4     | Feed + busca + detalhe do alimento                                                                                      | ✅ feito, merge em `develop` (`feat/rf11-feed`)                            |
| F5     | Cadastrar alimento (modal)                                                                                              | implementado (RF10, change `frontend-cadastro-alimento`); falta commit + PR para `develop` |
| F6     | Solicitar doação + erro de limite                                                                                       | pendente                                                                   |
| F7     | Listar pedidos (abas por status) + detalhe do pedido                                                                    | pendente                                                                   |
| F8     | Aceitar / rejeitar / confirmar recebimento                                                                              | pendente                                                                   |
| **X**  | Deploy cross-origin (CORS + cookie cross-subdomínio) — ver seção "Deploy"                                               | ✅ feito (change `deploy-cross-origin`); falta só setar as vars no Coolify |

Cadência por fase: `/opsx:propose <nome>` → `/opsx:apply` → `/opsx:archive` → commit → PR para `develop`.

---

## Protótipo Pencil vs RF do MVP

Arquivo: `/home/maria-vasconcelos/IFSP/Downloads/updated/pencil-design-apresentacao.pen`
(acesso só via MCP `pencil`). O protótipo foi feito para a versão final; abaixo o recorte.

### Telas inteiras FORA do escopo — não implementar

| Tela(s) no protótipo                                                                                                                                                                  | Motivo (Fora do Escopo em `docs/REQUISITOS.md`)                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Admin Dashboard`, `Admin Instituições`, `Admin Alimentos`, `Admin Pedidos`, `Admin Categorias`, `Admin Motivos de Cancelamento`, `Admin Administradores`, `Admin Modais de Exclusão` | "painel administrativo completo"                                                                                                                                   |
| `Revisar Alimento (Admin)`                                                                                                                                                            | painel admin + RF10 diz "disponível imediatamente, sem etapa de revisão"                                                                                           |
| `Esqueci Minha Senha` (E-mail / Código / Nova Senha)                                                                                                                                  | "recuperação de senha por código"                                                                                                                                  |
| `Listar Instituições`                                                                                                                                                                 | nenhum RF; browsing de instituições não existe no MVP                                                                                                              |
| `Perfil Público Estabelecimento`, `Perfil Público Entidade Beneficiária`                                                                                                              | "perfil público com histórico entre estabelecimento e entidade"                                                                                                    |
| `Meus Alimentos (Doador)`                                                                                                                                                             | edição/encerramento de alimento = "reativação/desativação manual"; e não há `GET /foods?owner=me`. O estabelecimento vê os próprios alimentos no Feed geral (RF11) |

### Regras transversais (valem em TODA tela)

1. **Status de pedido**: só `Pendente` / `Aceito` / `Rejeitado` / `Recebido`.
   O protótipo usa "Ativo/Em andamento/Doado/Cancelado" — traduzir. **Não existe "Cancelado"** no MVP.
2. **Zero "Cancelar pedido"** / fluxo de cancelamento — não há no MVP.
3. **Zero "Histórico do pedido" / timeline** de transições — nenhum RF, sem suporte no schema.
4. **Zero perfil público** — remover nav "Estabelecimentos"/"Instituições" e todos os links "Ver perfil de…".
5. **Zero WhatsApp** — "WhatsApp direto" é Fora do Escopo.
6. **Zero admin**.
7. Nome do produto: sempre **"Food Share"** (o protótipo tem "ConectaFood" em um lugar).
8. **Motivo de rejeição**: RF17 não tem motivo. Nenhum campo de motivo.
9. **Detalhe do pedido (RF20)**: instituições aparecem só com `id, companyName, tradeName, description, city, state`.
   **Sem** e-mail/telefone institucional, **sem** endereço de rua, **sem** dado pessoal do usuário.

---

## Fases

### F1 — Login, erro de login, logout (RF07, RF08, RF09)

- **Rota**: `/login` (pública). Layout de painel (brand à esquerda, form à direita — telas `Desktop - Login`).
- **Form**: e-mail + senha → `POST /api/auth/sign-in/email` → em sucesso, `AuthProvider.signIn` + redirect para `location.state.from ?? '/feed'`.
- **RF08**: erro → **uma mensagem genérica única** ("E-mail ou senha inválidos."), sem distinguir campo, sem revelar conta excluída. `ApiError` do sign-in vem como `401`.
- **Logout (RF09)**: já existe no `UserMenu` (menu do avatar → "Sair"). Nada novo, só confirmar.
- **REMOVER do protótipo**: link "Esqueci minha senha"; qualquer campo além de e-mail/senha.
- **Validação de form** (RNF06, adiantado): zod — e-mail válido, senha não vazia.
- **Feito** (change arquivada `openspec/changes/archive/2026-09-10-frontend-login/`):
  além do acima — reconciliação dos tokens `--primary`/`--primary-foreground`/`--ring`
  para o accent azul do protótipo (`#1d4ed8`), logo do Food Share
  (`frontend/src/assets/logo-foodshare.png`) na topbar e no painel de login, e
  favicon (`frontend/public/favicon.ico`, no lugar do `favicon.svg` do template).

### F2 — Cadastro (RF01, RF02, RF03, RF04)

- **Rota**: `/cadastro` (pública, multi-etapa; `useState`/`sessionStorage` para o rascunho entre passos).
- **Endpoints**: `POST /api/establishments` e `POST /api/beneficiary-entities` (não `sign-up`).
- **Etapas** (alinhar com o DTO do backend — hoje o protótipo está incompleto):
  1. Tipo de perfil: Estabelecimento | Entidade beneficiária.
  2. Dados institucionais: `companyName` (razão social), `tradeName` (nome fantasia, opcional), `cnpj`,
     `institutionalEmail`, `institutionalPhone`, `description`.
  3. Dados do responsável: `name`, e-mail de login (`email`), `personalPhone`, `password` + confirmação.
  4. Endereço: `postalCode`, `street`, `number`, `complement` (opcional), `city`, `state`. **Uma vez só.**
- **RF02/RF04**: em `409` (CNPJ/e-mail/celular já usados), mensagem genérica de duplicidade
  (mesma linha do backend `mensagem-generica-duplicidade-cadastro`).
- **REMOVER do protótipo**:
  - Passo "Categorias de alimentos" (entidade escolhendo categorias) — não é RF.
  - "Nome de perfil" — usar razão social / nome fantasia.
  - Endereço duplicado entre etapas; campo único "Rua, número, complemento" → separar.
  - Texto "ConectaFood".
- **Faltando no protótipo, adicionar**: nome do responsável, celular pessoal, e-mail institucional, celular institucional.
- **Regex do backend** (espelhar no zod): telefone `/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/`;
  CNPJ estabelecimento `/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/`; CEP `/^\d{5}-?\d{3}$/`; UF 2 letras.
- **Foto de perfil — fora do F2.** O `CreateEstablishmentDto` / `CreateBeneficiaryEntityDto` não
  têm campo `image` (só o `PATCH me`, como URL) e não existe endpoint de upload no backend. Foto
  de perfil fica para um change futuro, junto de uma história de upload de imagem (problema comum
  a F2 e F5). O passo 5 "Foto de perfil" saiu do escopo — o wizard tem **4 etapas**.
- **Feito** (change `frontend-cadastro`, `feat/rf01-cadastro`): o wizard acima em
  `frontend/src/features/auth/sign-up/`; `AuthLayout` extraído da `LoginPage` (F1) e reusado em
  `/login` e `/cadastro`; `radio-group` shadcn adicionado; schemas zod espelham o `class-validator`;
  409 volta para a etapa do campo (institucional explícito, `personal` genérico). E2E no browser:
  cadastro de estabelecimento e de entidade → `201` → `/login` (sem sessão) → login OK; 409 de CNPJ
  e de dado pessoal; login sem regressão.
- **Protótipo Pencil — divergência aceita, não sincronizado.** Só a troca "ConectaFood" → "Food Share"
  foi aplicada (frames `8rwFj`, `IGtaI`, `WnpJd`). A restruturação (adicionar a etapa "Dados do
  responsável", separar os campos de endereço, remover as seções de categorias/foto/nome-de-perfil
  nos ~6–8 frames light+dark) **não foi feita**: é redesenho multi-frame de mockup e o código é a
  fonte da verdade. Os frames de cadastro do `.pen` ficam desatualizados em relação às telas reais.

### F3 — Edição de perfil (RF05, RF06)

- **Rota**: `/perfil`. Tela `Desktop - Meu Perfil` / `huKcK`.
- **Leitura**: precisava de `GET /establishments/me` e `GET /beneficiary-entities/me` — não existiam
  no backend (só `PATCH me`). Gap resolvido no F3 (um `GET` por controller, reaproveitando `toResponse`).
- **Edição** (`PATCH /api/establishments/me` | `/api/beneficiary-entities/me`):
  - **RF06**: renderizar `email pessoal`, `CNPJ` e `razão social` **somente leitura** no modo edição.
  - **RF05**: editáveis = contato (institucional), imagem, descrição, endereço.
- **REMOVER do protótipo**: seção "Zona de perigo" / "Desativar minha conta" (autoexclusão = Fora do Escopo);
  toggle/botão "WhatsApp".
- **Feito** (change `frontend-perfil`, `feat/rf05-edicao-perfil`): tela com alternância
  visualização/edição fiel ao protótipo (`huKcK`) em `frontend/src/features/profile/`; backend
  `GET /establishments/me` e `GET /beneficiary-entities/me` novos; `viacep.ts`/`ibge.ts`/`masks.ts`/
  `city-autocomplete.tsx` relocados de `features/auth/sign-up/` para `lib/`/`components/`
  (compartilhados agora entre cadastro e perfil), com `city-autocomplete.tsx` desacoplado do schema
  do form; `lib/validation.ts` novo centraliza os regex/UFs espelhados do backend. Durante a
  verificação, corrigidas divergências de cor entre o app e o protótipo Pencil (Topbar, `UserMenu`,
  `BrandPanel`, wizard de cadastro) e um bug de mount do `@react-input/mask` com telefone de 11
  dígitos pré-preenchido. E2E no browser: visualizar/editar/cancelar/409 nos dois papéis, sem
  regressão no cadastro (F2).

### F4 — Feed + busca + detalhe do alimento (RF11, RF12, RF13)

- **Rotas**: `/feed` (`GET /api/foods` paginado), `/alimentos/:id` (`GET /api/foods/:id`).
- **RF12 (busca)**: params `name`, `categoryId`, `city`, `state` — combinam por E. Filtros informados
  na URL (`useSearchParams`). O protótipo só tem dropdown "Estado" — **adicionar input de cidade**.
- **Paginação**: `page` / `pageSize` (default 20, teto 50). Resposta `{ data, total, page, pageSize }`.
- **Card do alimento** (RF11): imagem, nome, categoria, quantidade + unidade, vencimento, **estabelecimento de origem**.
- **Detalhe** (RF13): imagem, nome, categoria, quantidade/unidade, descrição, vencimento, status,
  estabelecimento (nome + cidade/UF). Do detalhe sai o botão "Solicitar doação" (abre o modal do F6).
- **REMOVER do protótipo**:
  - Seção "Solicitações para este alimento" (10 Pendentes / 20 Concluídas / …) — não é RF13.
  - Link "Ver perfil do estabelecimento".
  - Nav "Estabelecimentos".

### F5 — Cadastrar alimento (RF10)

- **Gatilho**: botão no Feed (para conta estabelecimento). Modal (`Modal Cadastro Alimento` / `oHutt`).
- **Endpoint**: `POST /api/foods`. Campos (RF10): **imagem**, nome, categoria (`categoryId` da lista fixa),
  quantidade, unidade de medida, descrição, data de vencimento.
- **REMOVER do protótipo**:
  - Campo "Tipo de solicitação aceita" (Somente total / parcial / ambos) — não é RF, não está no schema.
  - Campo "Observações" — schema só tem `description`.
- **Faltando, adicionar**: upload de imagem (o Feed mostra imagens; o modal não tem o campo).
- **Categorias**: seed = Perecíveis, Não Perecíveis, Hortifruti, Laticínios, Carnes, Pães e Massas, Bebidas, Outros.

### F6 — Solicitar doação + limite (RF14, RF15)

- **Gatilho**: botão "Solicitar doação" no detalhe do alimento (conta entidade beneficiária). Modal (`X7Llb6`).
- **Endpoint**: `POST /api/orders` com `{ foodId, quantity }` (quantidade total ou parcial; fracionário até 2 casas).
- **RF15**: em `409` ("limit of orders in progress"), mostrar que a entidade já tem 10+ pedidos em andamento
  e precisa encerrar algum. Bloquear/avisar antes se possível.
- **REMOVER/ajustar no protótipo**: texto "os dados de contato são compartilhados" (RF20 só expõe cidade/UF).

### F7 — Listar pedidos + detalhe do pedido (RF19, RF20)

- **Rotas**: `/pedidos` (`GET /api/orders`), `/pedidos/:id` (`GET /api/orders/:id`).
- **RF19**: `GET /api/orders?status=<Pendente|Aceito|Rejeitado|Recebido>` — lista paginada plana.
  Frontend renderiza **uma aba por status** (cada aba = um request com o filtro). Sem `status` = todos.
  Ordenado do mais recente ao mais antigo. Recorte pela sessão (estabelecimento vê os pedidos dos alimentos dele;
  entidade vê os que criou).
- **RF20** (`GET /api/orders/:id`): detalhe completo — id, quantidade, data, status; alimento por inteiro
  (registro histórico, aparece mesmo se depois ficou indisponível); as duas instituições só com
  `id, companyName, tradeName, description, city, state`.
- **REMOVER do protótipo**:
  - Aba "Cancelado" / status inexistentes.
  - Busca livre "por alimento, data, estabelecimento" — RF19 só suporta `?status=`.
  - "Histórico do pedido" / timeline.
  - Contato institucional (e-mail/telefone/WhatsApp) no detalhe.
  - "Cancelar pedido".
  - Links "Ver perfil de…".

### F8 — Aceitar / rejeitar / confirmar recebimento (RF16, RF17, RF18)

- Ações no detalhe do pedido (e opcionalmente na listagem):
  - **RF16** (estabelecimento): `PATCH /api/orders/:id/accept` — "Pendente" → "Aceito", reserva a quantidade.
    Erros `409`: não pendente / alimento indisponível / estoque insuficiente.
  - **RF17** (estabelecimento): `PATCH /api/orders/:id/reject` — "Pendente" → "Rejeitado". **Sem motivo.**
  - **RF18** (entidade beneficiária): `PATCH /api/orders/:id/receive` — "Aceito" → "Recebido", encerra o pedido.
- Após a mutation, invalidar as queries de listagem/detalhe (React Query).
- Confirmar recebimento é irreversível — texto de confirmação, sem "desfazer".

---

## Gaps de backend a resolver junto das fases

| Gap                                                                   | Fase  | O que fazer                                                                                                             |
| --------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| ~~`GET /establishments/me` e `GET /beneficiary-entities/me` não existem~~ | ~~F3~~ | ✅ feito na change `frontend-perfil`. |
| ~~CORS + cookie cross-subdomínio para staging~~                       | ~~X~~ | ✅ feito na change `deploy-cross-origin`.                                                                               |

---

## Deploy / ambientes

### Dev local (mesma origem via proxy)

- `frontend/.env`: `VITE_API_URL=/api`. O Vite faz proxy de `/api/*` → `http://localhost:3000`
  (`server.proxy` em `vite.config.ts`). No browser tudo é `localhost:5173` → cookie `sameSite: lax` flui.
- `backend/.env`: `TRUSTED_ORIGINS=http://localhost:5173`.

### Staging (`develop` → Coolify) — **CROSS-ORIGIN**

- Front: `https://app.staging.foodshare.com.br` · Back: `https://api.staging.foodshare.com.br`.
- Subdomínios distintos (mas mesmo site `foodshare.com.br`). O CORS + cookie
  cross-subdomínio já estão no código (change `deploy-cross-origin`); é só setar
  as variáveis no Coolify.

**Serviço da API (`backend`):**

```
BETTER_AUTH_URL="https://api.staging.foodshare.com.br"
TRUSTED_ORIGINS="https://app.staging.foodshare.com.br"
COOKIE_DOMAIN=".staging.foodshare.com.br"
```

- `TRUSTED_ORIGINS` alimenta o originCheck do better-auth **e** o CORS. Lista por
  vírgula (ex. incluir `http://localhost:5173` se quiser rodar o front local
  contra o staging).
- `COOKIE_DOMAIN` faz o cookie de sessão valer nos dois subdomínios. Deixar
  **vazio** em dev.
- `secure` no cookie liga sozinho porque `BETTER_AUTH_URL` é `https://` → o
  staging **precisa** servir HTTPS.

**Serviço do front (`frontend`):**

```
VITE_API_URL="https://api.staging.foodshare.com.br"
```

(URL absoluta — não `/api`; o proxy do Vite é só de dev.)

> Alternativa que dispensaria CORS/cookie: servir a API sob o **mesmo host**
> (`app.staging.foodshare.com.br/api` roteado pro backend). Aí `VITE_API_URL=/api`
> e só o `TRUSTED_ORIGINS` importa. Decisão de infra.

## Como continuar em outra máquina

1. `git clone` + `git switch develop` (F0 já está lá).
2. `docs/`: ler `REQUISITOS.md`, `MODELO-DE-DADOS.md`, `INFRAESTRUTURA.md`, `CONVENCOES.md`, este arquivo.
3. `backend/`: `cp .env.example .env`, ajustar, `npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run start:dev`.
4. `frontend/`: `cp .env.example .env`, `npm install`, `npm run dev`.
5. Retomar da próxima fase pendente na tabela "Estado atual" via `/opsx:propose`.
6. Changes arquivadas ficam em `openspec/changes/archive/` — histórico completo de cada RF/fase.
