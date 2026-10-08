## Why

O MVP só conhece estabelecimento e entidade beneficiária. A versão final tem
um terceiro ator, o **Administrador**, que modera a plataforma e mantém as
listas padronizadas. Toda a fase 1 (listas) e a fase 5 (painel) dependem de
existir um administrador que faça login, de rotas `/admin` protegidas por
papel e de uma auditoria das escritas dele. Esta change monta essa fundação,
ainda sem nenhuma funcionalidade de painel (item 0.2 de
`docs/PLANO-IMPLEMENTACAO.md`).

Junto vem o registro de acesso (RNF13): hoje o backend não registra nenhuma
requisição. Por decisão da dupla nesta proposta, **toda requisição** passa a
ser registrada, com usuário e IP, numa tabela própria.

## What Changes

- **Backend — papel:** o seed cria o papel `Administrator`. Os nomes dos três
  papéis passam a vir de uma constante única (`ROLE`), como os status.
- **Backend — `User.personalPhone` opcional:** o administrador não tem celular.
  A obrigatoriedade para instituições continua nos DTOs de cadastro e edição.
- **Backend — primeiro administrador pelo seed:** criado a partir de
  `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, pela API do
  better-auth, só se ainda não existir nenhum administrador. Sem as variáveis,
  o passo é pulado com aviso.
- **Backend — guard de papel:** decorator próprio de papéis + guard. Rotas sob
  `/admin` exigem `Administrator`; instituição recebe `403`. As rotas de
  instituição (`/foods`, `/orders`, `/categories`, `/establishments/me`,
  `/beneficiary-entities/me`) passam a recusar o administrador com `403`.
  `GET /me` continua aberto a qualquer usuário autenticado.
- **Backend — auditoria:** model `AuditLog` (`audit_log`) e `AuditService`,
  que grava a linha na mesma transação da escrita do administrador.
- **Backend — registro de acesso (novo, decidido nesta proposta):** model
  `AccessLog` (`access_log`). Toda requisição HTTP grava método, caminho,
  status da resposta, duração, IP, user agent e o usuário autenticado (quando
  houver), inclusive login e logout do better-auth. A gravação não atrasa nem
  derruba a resposta.
- **Backend — tarefas:** rota `POST /admin/jobs/:name/run`, com registro de
  tarefas ainda vazio: qualquer nome responde `404` com
  `code: JOB_NOT_FOUND`. A fase 6 registra as tarefas reais.
- **Frontend — papel:** `role` passa a aceitar `administrator`.
- **Frontend — login por papel:** o administrador cai em `/admin`; instituição
  continua indo para `/feed`.
- **Frontend — painel:** layout próprio do painel com menu lateral e uma página
  vazia ("em construção") para cada item das fases 1 e 5. Logout no painel.
- **Frontend — bloqueio cruzado:** instituição que abre `/admin/...` volta para
  `/feed`; administrador que abre uma tela de instituição volta para `/admin`.
- **Banco:** uma migration (`personalPhone` opcional, `audit_log`,
  `access_log`). Não exige reset: é aditiva.
- **Docs:** `docs/MODELO-DE-DADOS.md` ganha o model `AccessLog`, e
  `docs/REQUISITOS.md` ganha a decisão DT19 (registro de acesso em tabela).

## Cobertura

- **RF06** — login do administrador com e-mail e senha (a rota de login não
  muda; o papel e o redirecionamento são novos).
- **RF07** — logout do administrador, a partir do painel.
- **RNF13** — logs de acesso (toda requisição, em `access_log`) e de ações do
  administrador (cada requisição `/admin` também cai em `access_log`; as
  escritas, em `audit_log`).
- **RNF14** — tabela de auditoria e `AuditService`. Ainda não há escrita de
  administrador além da rota de tarefas, então a auditoria real começa na 1.3.
- **RN34** — sempre existe pelo menos um administrador: garantido aqui pelo
  seed. A recusa de excluir o último fica na 5.1, onde nasce a exclusão.
- **RN46** — toda escrita de administrador grava auditoria, na mesma
  transação (contrato do `AuditService`).

## Fora desta change

- CRUD de administradores, inclusive a recusa de excluir o último (5.1, RF29–RF32).
- Qualquer tela funcional do painel: listas (1.3), sugestões (1.5),
  instituições (5.2, 5.3), alimentos (5.4), pedidos (5.5).
- Tarefas agendadas reais e `@nestjs/schedule` (6.1, 6.2).
- Tela de consulta da auditoria ou dos acessos (opcional, `docs/PENDENCIAS.md`).
- Dashboard do administrador (opcional, `docs/PENDENCIAS.md`).
- Recuperação de senha do administrador (4.1).
- Imagem do administrador (upload chega na 0.3; o administrador do seed fica
  sem imagem).

## Perguntas em aberto

- **Retenção do `access_log`.** IP é dado pessoal (LGPD) e a tabela cresce a
  cada requisição. Nenhum RF/RN define por quanto tempo guardar. Proposta:
  sem limpeza nesta change, e a política de retenção entra em
  `docs/PENDENCIAS.md` para a dupla decidir.

## Capabilities

### New Capabilities

- `admin/acesso`: papel `Administrator`, primeiro administrador pelo seed e
  separação de rotas por papel (`/admin` só para administrador, rotas de
  instituição só para instituição), no backend e no frontend.
- `admin/painel`: layout do painel administrativo, menu lateral, páginas
  vazias e redirecionamento do administrador após o login.
- `admin/tarefas`: rota de execução manual de tarefas pelo administrador.
- `auditoria/acoes-administrador`: tabela de auditoria e contrato de gravação
  das escritas do administrador.
- `auditoria/acessos`: registro de toda requisição em `access_log`.

### Modified Capabilities

(nenhuma — login e logout não mudam de requisito; o redirecionamento do
administrador fica em `admin/painel`)

## Impact

- **Schema:** `User.personalPhone` opcional; models `AuditLog` e `AccessLog`;
  relações em `User`. Uma migration nova.
- **Backend:** `auth.instance.ts` (`personalPhone` deixa de ser obrigatório no
  better-auth; hook para atribuir o usuário ao acesso de login), `prisma/seed.ts`,
  módulos novos `audit/`, `access-log/`, `admin/` (jobs); decorator e guard de
  papel; controllers de `foods`, `orders`, `categories`, `establishments`,
  `beneficiary-entities` ganham a restrição de papel; `main.ts` (`trust proxy`).
- **Frontend:** `features/auth` (papel, redirecionamento), `app/router.tsx`,
  `features/admin/` (layout, menu, páginas vazias), `SessionUser.personalPhone`
  anulável.
- **Ambientes:** `SEED_ADMIN_*` no `backend/.env.example` e no Coolify
  (staging). O seed passa a depender das variáveis do better-auth.
- **API:** administrador passa a receber `403` em `/foods`, `/orders`,
  `/categories` e nas rotas `/me` de instituição (antes não havia
  administrador, então nenhum cliente quebra).
