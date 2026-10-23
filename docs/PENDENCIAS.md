# Pendências

Itens deixados pendentes de propósito: não são tarefa imediata, mas
precisam ser retomados em algum momento. Cada entrada diz por que ficou para
depois e quando ou como retomar.

## Número de WhatsApp dedicado (P01)

**Situação:** os lembretes (RF73, RF74) são implementados na fase 6.2, mas
ficam desligados (`N8N_WEBHOOK_URL` vazio) até existir um número próprio do
Food Share conectado ao n8n.

**O que fazer:**

- Comprar um chip pré-pago.
- Conectar o número no n8n.
- Criar o fluxo que recebe o webhook (validando o `X-Webhook-Secret`) e envia a mensagem.
- Preencher as variáveis no Coolify.

Manter o chip com recarga periódica, para a operadora não cancelar a linha.

**Não fazer:** usar um número pessoal. Mensagem automática para números
desconhecidos é o cenário que mais leva o WhatsApp a banir o número.

## Revisão visual tela a tela vs. protótipo Pencil

**Quando:** fase 7.1 do `docs/PLANO-IMPLEMENTACAO.md`, com todas as telas
prontas. Revisar tudo de uma vez rende mais do que ajustar telas isoladas
enquanto a estrutura delas ainda pode mudar.

**O que fazer:** comparar cada tela com o frame correspondente do
protótipo (`pencil-design-apresentacao.pen`, via MCP `pencil`), conferindo:

- tamanho de fonte (`font-size`) de títulos, textos e labels;
- peso de fonte (`font-weight`);
- tamanho de imagens (logo, ícones, avatares, imagens de alimento);
- posicionamento e alinhamento (espaçamento, ordem).

**Contexto:** vários valores não batem 1:1 com o protótipo, e nem todo
desvio é acidental. O MVP trocou os `px` literais do protótipo (pensado para
um frame de 1280 px) pelos passos padrão do Tailwind/shadcn, porque ficavam
grandes demais na viewport real (decisão da change arquivada
`frontend-login`). A revisão precisa separar esses ajustes intencionais do
desvio acumulado, com o mesmo critério para todas as telas.

## Tela de consulta da auditoria (opcional)

**Situação:** a auditoria é gravada em `audit_log` desde a fase 0.2, mas sem
tela (DT09).

**Quando:** só se sobrar tempo depois da fase 7.2. Uma tabela somente
leitura no painel, com filtros por administrador, ação e período, usando a
tabela administrativa da fase 1.3. Funciona bem na apresentação.

## Dashboard do administrador (opcional)

**Situação:** o protótipo tem um dashboard, mas nenhum RF pede um.

**Quando:** só se sobrar tempo. Indicadores simples (alimentos ativos,
pedidos por status, doações concluídas no mês, sugestões pendentes), sem
biblioteca de gráficos nova se der para evitar.

## Métricas reais no login e na landing page (opcional)

**Situação:** o painel de marca da tela de login
(`frontend/src/features/auth/brand-panel.tsx`) e a landing page (repositório
`landing-page`) mostram números fixos ("500+ estabelecimentos", "120+
entidades parceiras", "10k+ doações feitas"). Nenhum RF pede métricas
públicas.

**Ideia:** uma rota pública (`@AllowAnonymous`), ex.: `GET /stats`, com
contagens agregadas: estabelecimentos e entidades não excluídos e pedidos
`Doado` (em número de pedidos, não em quantidade, porque as unidades
variam).

**O que decidir antes:**

- Números pequenos: mostrar o valor real, esconder abaixo de um mínimo ou
  manter os fixos até haver volume.
- Como a landing busca os números: no navegador (exige incluir
  `https://foodshare.com.br` no `TRUSTED_ORIGINS`, que também alimenta o
  originCheck do better-auth) ou no build do Astro (sem CORS, mas o número
  só muda a cada publicação).
- Cache da rota anônima (em memória por alguns minutos e
  `Cache-Control: public`), para cada visita não virar uma consulta no
  banco.
- Incluir a rota no Gatus.
- Registrar a decisão como RF ou DT em `docs/REQUISITOS.md` e como item no
  `docs/PLANO-IMPLEMENTACAO.md`.

**Quando:** só se sobrar tempo, perto da 4.3 (perfis públicos) ou junto do
dashboard do administrador, que usa contagens parecidas.

## Busca de dados no frontend: SWR ou TanStack Query

**Situação:** a ideia de usar o SWR surgiu durante a change `upload-imagens`.
O frontend já usa o **TanStack Query** (`@tanstack/react-query` v5) em 12
arquivos (`useQuery`, `useMutation`, `useQueries`), e o
`docs/CONVENCOES.md` o lista como stack fixa. Ficaram fora dele:

- a sessão (`GET /me`), carregada à mão no `AuthProvider`, com estado
  próprio e um `refreshSession` chamado depois de trocar a foto;
- as cidades do IBGE (`lib/ibge.ts`), com cache manual num `Map` e
  `useEffect` no `CityAutocomplete`.

**Problema real (precisar de F5):** a revalidação está desligada na
configuração global (`frontend/src/lib/query-client.ts`, desde a fundação
do frontend): `refetchOnWindowFocus: false` e `staleTime: 30_000`, sem
`refetchInterval` em nenhuma query. As ações da própria pessoa atualizam a
tela (cada mutation invalida as queries certas), mas o que **a outra
instituição** faz (pedido novo, aceite, recebimento) só aparece com F5, ou
navegando depois de 30 s.

**Comparação:** os dois seguem o padrão _stale-while-revalidate_ por
padrão (cache, revalidação ao focar a janela e ao montar, deduplicação). O
SWR é menor e mais simples para leitura. O TanStack Query tem mais para
escrita (`useMutation`, `invalidateQueries`, `setQueryData`, que o perfil já
usa) e o `queryClient.clear()` do logout. Trocar de biblioteca com a mesma
configuração manteria o problema; trocar exigiria ainda reescrever as 12
telas e mudar a convenção.

**Correção proposta (independe da escolha):**

- `refetchOnWindowFocus: true` e `staleTime` baixo (ex.: 5 s) no
  `query-client.ts`.
- `refetchInterval` (ex.: 30 s) nas telas em que a outra parte age: lista e
  detalhe de pedidos e contadores do menu.
- Testar com duas sessões (entidade e estabelecimento) em navegadores
  diferentes.

**Recomendação:** manter o TanStack Query, aplicar a correção acima e levar
para ele o que ficou de fora. A sessão vira uma query (`['me']`), e a troca de foto passa a ser um
`invalidateQueries(['me'])` em vez do `refreshSession`. As cidades viram uma
query por UF com `staleTime: Infinity`, no lugar do `Map`. O `401` do `/me`
continua sendo o estado "sem sessão", então a rota não muda.

**O que decidir:** SWR ou TanStack Query. Se for SWR, atualizar o
`docs/CONVENCOES.md` antes e migrar tudo de uma vez, para não conviverem
dois caches.

**Quando:** a correção da revalidação já entrou (branch
`fix/revalidacao-queries`): `staleTime` de 5 s, revalidação ao focar a
janela e `refetchInterval` de 30 s na lista, no detalhe e nos contadores de
pedidos. A migração da sessão e das cidades fica para a 4.4
(`exclusao-propria-conta`), que já mexe na sessão para revogá-la. Ela não
corrige nenhum problema visível hoje: traz a revalidação da sessão ao focar
a janela (cabeçalho desatualizado após editar o perfil em outra aba) e a
nova tentativa com estado de erro nas cidades (hoje, uma falha do IBGE
mostra a lista vazia sem aviso). Se a falha do IBGE incomodar antes, corrigir
só as cidades, sem tocar na sessão.

## Retenção do registro de acesso (`access_log`)

**Situação:** desde a change `papel-administrador`, toda requisição à API é
gravada em `access_log` (DT19), com usuário e IP. A tabela não é limpa.

**Por que importa:** IP é dado pessoal (LGPD), e a tabela cresce a cada
requisição.

**O que decidir:** por quanto tempo guardar (ex.: 90 dias) e como limpar
(tarefa diária no módulo `jobs/`, a partir da 6.1, apagando por
`createdAt`, que já tem índice). Registrar a decisão em `docs/REQUISITOS.md`.

## Limite de requisições (rate limit) na API

**Situação:** nenhum RF, RNF, RN ou DT cobre limite de requisições na API em
geral. O único caso previsto é o RNF11 (código de recuperação de senha, uma
vez a cada 10 minutos por origem, com o limite nativo do better-auth, DT17),
que entra na 4.1. Hoje existe só o limite nativo do better-auth, com alcance
pequeno:

- vale apenas para as rotas `/auth/*` chamadas pelo cliente, e só com
  `NODE_ENV=production`;
- padrão: 100 requisições a cada 10 s por IP; login e cadastro do próprio
  better-auth, 3 a cada 10 s;
- **não** vale para chamadas internas `auth.api.*`. O nosso cadastro
  (`POST /establishments` e `POST /beneficiary-entities`) chama
  `auth.api.signUpEmail()`, então não tem limite nenhum. Desde a 0.3, essa
  rota anônima aceita até 5 MB por requisição gravados no MinIO.

As demais rotas exigem sessão, mas também não têm limite.

**Ideia:** `@nestjs/throttler` (JavaScript puro, sem binário nativo) com um
limite global por IP e um limite bem mais baixo nas rotas anônimas de
cadastro. O `trust proxy` já está ligado no `main.ts`, então o IP real do
cliente chega atrás do Traefik. Armazenamento em memória basta enquanto houver
uma única instância por ambiente (mesma premissa das tarefas agendadas).

**O que decidir:**

- Os limites: global (ex.: 100 por minuto por IP) e cadastro (ex.: 5 por
  hora por IP).
- Resposta: `429` com `code` próprio (ex.: `TOO_MANY_REQUESTS`) e mensagem
  no frontend.
- Se o `/health` e o `GET /me` usados pelo Gatus ficam fora do limite.
- Registrar como RNF ou DT em `docs/REQUISITOS.md` e como item no
  `docs/PLANO-IMPLEMENTACAO.md`.

**Quando:** antes do deploy de produção (7.3), de preferência logo, porque o
cadastro anônimo com upload já está no ar.

## Versão do Node no build (Nixpacks)

**Situação:** o Nixpacks está fixado em Node 22.13.1
(`nixpkgsArchive` em `backend/nixpacks.toml`), mas o
`@thallesp/nestjs-better-auth@2.7.0` exige `>=22.22.1`. Hoje o build só
mostra o aviso `EBADENGINE` e a API funciona.

**O que fazer:** subir o `nixpkgsArchive` para um que traga Node 22.22.1
ou mais novo, validar o build ARM64 no Coolify e atualizar a linha do Node
em `docs/INFRAESTRUTURA.md`.

**Quando:** numa branch própria, antes do deploy de produção (7.3), ou
antes se o aviso virar erro.

## Antes de tornar o repositório público

**Situação:** há a intenção de tornar o repositório público no GitHub.

**O que fazer antes:**

- Conferir se nenhum segredo (chaves, senhas, `.env`) entrou no histórico do git. Se entrou, trocar o segredo no serviço; apagar do histórico não basta.
- Revisar os `.env.example`.
