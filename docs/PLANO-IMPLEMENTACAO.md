# Plano de implementação — versão final

Este documento organiza a execução da versão final: em que ordem cada parte é
construída e o que cada uma entrega. **Ele substitui o `PLANO-FRONTEND.md` do
MVP**, que está em `docs/mvp/` como histórico.

- O **que** construir está em `docs/REQUISITOS.md`. Este arquivo diz **em
  que ordem** e **como dividir**.
- Cada item é **uma change do OpenSpec**, com backend e frontend juntos,
  salvo quando indicado. O fluxo de cada change está em `docs/CONVENCOES.md`
  ("Fluxo de trabalho").
- A ordem respeita as dependências. Não comece um item antes que os itens
  de que ele depende estejam em `develop`.
- Ao concluir um item, marque ✅ na coluna Status, na mesma branch.

## Ponto de partida (o que o MVP já entregou)

Já estão prontos e em `develop`:

- cadastro, login e logout;
- perfil (visualização e edição);
- feed com busca sem acento e detalhe do alimento;
- cadastro de alimento;
- pedido total ou parcial, com o limite de 10 e o bloqueio de pedido
  duplicado;
- listagem de pedidos por status, detalhe, aceite, rejeição e confirmação de
  recebimento;
- deploy cross-origin no staging.

As specs em `openspec/specs/` descrevem esse estado. Cada change abaixo
**altera** as specs que tocar (requisitos `MODIFIED`), em vez de criar specs
paralelas. Se uma spec antiga conflitar com `docs/REQUISITOS.md`, vale o
`REQUISITOS.md`, e a change corrige a spec.

## Visão geral

| # | Change | Cobre | Depende de | Meta | Status |
| - | ------ | ----- | ---------- | ---- | ------ |
| 0.1 | `status-pedido-final` | DT01, DT02, RF24, RF27 (abas) | — | 05/10 | ✅ |
| 0.2 | `papel-administrador` | RF06 (admin), RNF13, RNF14, RN34, RN46 | 0.1 | 05/10 | ✅ |
| 0.3 | `upload-imagens` | RNF09, RN41, RF01–RF03 (imagem) | 0.1 | 07/10 | ⬜ |
| 1.1 | `listas-padronizadas-modelo` | Modelo + seeds das listas, RN31, RN37, RN40 | 0.2 | 09/10 | ⬜ |
| 1.2 | `catalogo-taco` | DT12 | 1.1 | 12/10 | ⬜ |
| 1.3 | `admin-listas` | RF33–RF40, RF59–RF70 | 1.1, 0.2 | 14/10 | ⬜ |
| 1.4 | `termos-proibidos-validacao` | RNF07 | 1.1 | 14/10 | ⬜ |
| 1.5 | `sugestoes` | RF49, RF71, RN39 | 1.3 | 16/10 | ⬜ |
| 2.1 | `cadastro-alimento-padronizado` | RF14, RF20, RF21, RN15–RN17, RN25 | 0.3, 1.2 | 19/10 | ⬜ |
| 2.2 | `meus-alimentos` | RF15–RF19, RN20–RN24 | 2.1 | 22/10 | ⬜ |
| 3.1 | `pedido-tipo-e-reserva` | RF22, RF23, RF25, RN03, RN07, RN08 | 2.1 | 24/10 | ⬜ |
| 3.2 | `cancelar-pedido` | RF26, RN09 | 3.1 | 26/10 | ⬜ |
| 3.3 | `pedidos-busca-e-contato` | RF27 (busca), RF28, RF09, RN12 | 3.1 | 28/10 | ⬜ |
| 4.1 | `recuperar-senha` | RF08, RNF11, RNF12, RN33 | 0.1 | 29/10 | ⬜ |
| 4.2 | `perfil-completo` | RF03, RF11 (ajustes) | 0.3 | 30/10 | ⬜ |
| 4.3 | `instituicoes-e-perfil-publico` | RF10, RF12, RF13, RN35, RN36 | 4.2 | 01/11 | ⬜ |
| 4.4 | `exclusao-propria-conta` | RF04, RF05, RN28–RN30 | 3.2 | 03/11 | ⬜ |
| 5.1 | `admin-administradores` | RF29–RF32 | 0.2 | 04/11 | ⬜ |
| 5.2 | `admin-instituicoes` | RF41, RF44, RF47, RF48, RF57, RF58 | 5.1, 4.4 | 06/11 | ⬜ |
| 5.3 | `admin-exclusoes-instituicoes` | RF42, RF43, RF45, RF46 | 5.2 | 08/11 | ⬜ |
| 5.4 | `admin-alimentos` | RF50–RF53 | 2.2, 5.1 | 09/11 | ⬜ |
| 5.5 | `admin-pedidos` | RF54–RF56, RN13 | 3.3, 5.1 | 10/11 | ⬜ |
| 6.1 | `expiracao-pedidos` | RF72, RN11 | 3.2 | 11/11 | ⬜ |
| 6.2 | `lembretes-whatsapp` | RF73, RF74, RNF17, RN42–RN44 | 6.1 | 13/11 | ⬜ |
| 7.1 | `revisao-visual` | RNF01–RNF03, `docs/PENDENCIAS.md` | todas as telas | 16/11 | ⬜ |
| 7.2 | `testes-casos-tcc` | CTs do documento do TCC | 7.1 | 18/11 | ⬜ |
| 7.3 | `deploy-producao` | Ambiente de produção | 7.2 | 20/11 | ⬜ |

As metas são sugestões para chegar à Entrega 9 (Produto Final, 20/11) com a
Entrega 7 (Qualidade, 06/11) já com os fluxos principais prontos. Ajuste se
o cronograma da disciplina pedir.

---

## Fase 0 — Fundação

### 0.1 `status-pedido-final`

- **Backend**
  - Seed de status: pedido `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado`; alimento `Ativo`, `Reservado`, `Inativo`.
  - Constantes centralizadas (`ORDER_STATUS`, `FOOD_STATUS`) e troca de todas as strings soltas do MVP por elas.
  - O filtro `GET /orders?status=` aceita os nomes novos.
  - Nas specs, o conjunto `Pendente` + `Em andamento` passa a se chamar **pedidos em aberto**. "Em andamento" fica reservado ao status. Os códigos de erro não mudam.
- **Frontend**
  - Rótulos centralizados.
  - Abas da listagem de pedidos: Pendente → Em andamento → Rejeitado → Doado → Cancelado. A aba Cancelado fica vazia até a 3.2.
  - Selo de status com as cores novas.
  - Textos "Aceito/Recebido" trocados em todas as telas (detalhe, ações, diálogos, toasts).
- **Banco:** reset local e no staging (P02, `docs/MODELO-DE-DADOS.md`, "Migração").
- **Pronto quando:** o fluxo do MVP (pedir → aceitar → confirmar) funciona de ponta a ponta com os nomes novos e sem nenhuma string antiga no código (`grep` de "Aceito"/"Recebido" vazio).

### 0.2 `papel-administrador`

- **Backend**
  - Papel `Administrator`; `User.personalPhone` opcional.
  - Seed do primeiro administrador por variáveis de ambiente.
  - Guard de papel e prefixo `/admin`.
  - Model `AuditLog` + `AuditService` (gravação na mesma transação).
  - Rota `POST /admin/jobs/:name/run`, ainda sem tarefas.
- **Frontend**
  - Login do administrador redireciona para `/admin`.
  - Layout do painel (menu lateral do protótipo) com páginas vazias para os itens das fases 1 e 5.
  - Instituição que acessa `/admin` volta para o feed.
- **Pronto quando:** o admin do seed faz login e vê o painel vazio, e uma instituição não consegue acessar nenhuma rota `/admin`.

### 0.3 `upload-imagens`

- **Backend:** módulo `files`. Upload (`POST /files`, multipart) e leitura (`GET /files/*key`) conforme `docs/INFRAESTRUTURA.md`, com validação de tamanho e tipo real (RN41).
- **Frontend**
  - Componente de upload reutilizável, com prévia, erro de tamanho/tipo e troca.
  - Aplicado na etapa de foto do cadastro (RF01/RF02 exigem imagem, então a etapa "Foto de perfil" do protótipo volta) e na edição de perfil.
- **Pronto quando:** cadastro com foto, troca de foto no perfil e exibição da imagem pela rota do backend funcionam no staging, com o MinIO acessado só pela rede interna.

## Fase 1 — Listas padronizadas

### 1.1 `listas-padronizadas-modelo`

- **Só backend.**
  - Models `FoodCatalogItem`, `MeasurementUnit`, `ProhibitedTerm` e `Suggestion` (+ enums).
  - `Category.administratorId` e `CancellationReason.isSystem`.
  - Seeds de unidades, motivos (de sistema e comuns) e termos proibidos.
  - Catálogo com um seed **provisório** de ~20 itens, só para destravar o desenvolvimento.
  - Rotas públicas de leitura das listas para os selects (`GET /catalog/...`, com busca sem acento). Motivos de sistema nunca aparecem nelas.
- **Pronto quando:** `prisma migrate reset` + seed criam todas as listas, e as rotas de leitura respondem com busca sem acento.

### 1.2 `catalogo-taco`

- **Tarefa de dados, sem tela.** Gerar `prisma/seed-data/food-catalog.ts` a partir da TACO (DT12):
  - remover variações de preparo (cru, cozido, frito);
  - deixar os nomes naturais ("Pão francês", não "Pão, trigo, francês");
  - ligar cada item a uma das categorias do seed;
  - resultado: 150 a 250 itens.
- **A lista vai para revisão humana na proposta da change, antes do apply.**
- **Pronto quando:** a dupla aprovou a lista e o seed a carrega.

### 1.3 `admin-listas`

- **Backend + frontend:** CRUD completo, no painel, de categorias (RF33–RF36), motivos (RF37–RF40, protegendo os de sistema), unidades (RF59–RF62), catálogo (RF63–RF66) e termos proibidos (RF67–RF70).
  - Busca e ordenação por campo.
  - Exclusão bloqueada se a opção estiver em uso (RN37).
  - Auditoria em toda escrita.
- **Frontend:** um componente genérico de tabela administrativa (busca, ordenação, paginação, ações), reaproveitado depois na fase 5.
- **Pronto quando:** as cinco listas são gerenciáveis pelo painel, e cada escrita aparece em `audit_log`.

### 1.4 `termos-proibidos-validacao`

- **Backend:** validação (decorator/pipe) aplicada a todo campo de texto livre:
  - descrição de instituição e de alimento;
  - observações;
  - texto de sugestão;
  - nome fantasia.

  Ela bloqueia os termos da tabela, comparando sem acento e sem diferenciar maiúsculas, e bloqueia links/URLs por regex. Erro `400` com `code: PROHIBITED_CONTENT` e o nome do campo.
- **Frontend:** mostra o erro no campo certo.
- **Pronto quando:** um termo cadastrado no painel passa a ser recusado nos formulários sem novo deploy.

### 1.5 `sugestoes`

- **Backend:** criar sugestão (RF71, instituições); listar, aprovar e recusar (RF49, admin). Aprovar cria a opção na lista, na mesma transação, com ajuste de texto e escolha de categoria para item do catálogo.
- **Frontend**
  - Ação "Sugerir nova opção" no componente de select com busca: um diálogo curto que não fecha o formulário em andamento.
  - Tela de sugestões no painel, com filtros por tipo e status.
- **Pronto quando:** a sugestão feita no meio de um cadastro não interrompe o cadastro, e, depois de aprovada, aparece no select.

## Fase 2 — Alimentos

### 2.1 `cadastro-alimento-padronizado`

- **Backend**
  - `Food` muda conforme `docs/MODELO-DE-DADOS.md`: catálogo, unidade, `requestType`, `notes` e imagem obrigatória.
  - O alimento nasce `Ativo`.
  - Validação de fração pela unidade.
  - A busca do feed (RF20) passa a fazer join com o catálogo, mantendo o `unaccent`.
  - O detalhe (RF21) devolve tipo de solicitação, observações, unidade e data de publicação.
- **Frontend**
  - Modal "Cadastrar Alimento" fiel ao protótipo: select de alimento (que preenche a categoria, somente leitura), select de unidade, cartões de tipo de solicitação, observações e upload de imagem.
  - O feed e o detalhe exibem os campos novos.
- **Pronto quando:** um alimento cadastrado aparece na hora no feed, com nome e categoria do catálogo, e a busca por "pao" encontra "Pão francês".

### 2.2 `meus-alimentos`

- **Backend**
  - `GET /foods/mine`, com status, busca e ordenação (RF19).
  - Editar validade e quantidade (RF15, com os efeitos da RN20 sobre pedidos pendentes totais e parciais e o registro de `quantityUpdatedAt`).
  - Desativar (RF18), reativar (RF17) e excluir logicamente (RF16, motivo obrigatório se houver pedido em andamento).
- **Frontend**
  - Tela "Meus Alimentos" do protótipo, com abas Ativo/Reservado/Inativo e ações por linha, respeitando cada estado.
  - Diálogos de confirmação dizem quantos pedidos serão afetados.
- **Pronto quando:** cada ação produz exatamente as transições da máquina de estados do alimento, conferidas com pedidos pendentes e em andamento.

## Fase 3 — Pedidos

### 3.1 `pedido-tipo-e-reserva`

- **Backend**
  - `Order.type` e `acceptedAt`.
  - A criação valida a quantidade pelo `requestType` (RN03).
  - Aceite conforme RN07: desconto com trava, `Reservado` ao zerar e rejeição automática dos pendentes que não cabem.
  - Confirmação conforme RN08.
- **Frontend**
  - O modal "Solicitar doação" mostra só as opções que o tipo do alimento permite.
  - O aceite mostra o efeito ("3 pedidos pendentes serão rejeitados").
- **Pronto quando:** os cenários da RN03, RN07 e RN08 passam, inclusive dois aceites simultâneos sem estoque negativo.

### 3.2 `cancelar-pedido`

- **Backend:** `PATCH /orders/:id/cancel` com `cancellationReasonId` (RN09). Motivo de sistema é recusado.
- **Frontend:** a ação "Cancelar pedido" no detalhe, para as duas partes, com o select de motivo (e "Sugerir nova opção"), e a aba Cancelado mostrando o motivo.
- **Pronto quando:** cancelar um pedido em andamento devolve o estoque e tira o alimento de `Reservado`.

### 3.3 `pedidos-busca-e-contato`

- **Backend**
  - Busca da listagem por nome do alimento, data e nome do estabelecimento (RF27).
  - O detalhe inclui e-mail, celular e endereço da outra parte só quando o pedido está `Em andamento` (RN12).
  - O detalhe continua acessível às partes mesmo após a exclusão lógica.
- **Frontend**
  - Busca na listagem.
  - Card de contato no detalhe do pedido em andamento, com botão do WhatsApp (`wa.me`, RF09).
  - Aviso "Quantidade atualizada pelo estabelecimento em …" quando `quantityUpdatedAt` existe.
- **Pronto quando:** o contato aparece só em pedido em andamento, e o link do WhatsApp abre com o número em formato internacional.

## Fase 4 — Conta e instituições

### 4.1 `recuperar-senha`

- **Backend:** plugin `emailOTP` + Resend + `rateLimit.customRules` (`docs/MODELO-DE-DADOS.md`, "Recuperação de senha"). Sem wrapper.
- **Frontend:** as três telas do protótipo "Esqueci minha senha" (e-mail → código → nova senha) e o link na tela de login.
- **Pronto quando:** o fluxo completo funciona no staging com e-mail real, e uma segunda solicitação em menos de 10 minutos é recusada com mensagem clara.

### 4.2 `perfil-completo`

- **Backend + frontend:** passam a ser editáveis também o nome fantasia, o celular pessoal e o nome do responsável (RF03). Continuam somente leitura: e-mail pessoal, CNPJ e razão social.
- **Pronto quando:** a tela de perfil cobre todos os campos do RF03 e do RF11.

### 4.3 `instituicoes-e-perfil-publico`

- **Backend:** listagem das instituições do tipo oposto, com busca (RF10), e perfil público só com os dados da RN36. O perfil da entidade traz os pedidos entre as duas (RF12); o do estabelecimento traz os alimentos ativos (RF13).
- **Frontend:** telas "Listar Instituições" e "Perfil Público" do protótipo, **sem** contato e sem endereço, e item novo no menu.
- **Pronto quando:** nenhuma resposta dessas rotas contém contato, endereço ou dado pessoal (conferir o JSON, não só a tela).

### 4.4 `exclusao-propria-conta`

- **Backend:** a rota própria de exclusão lógica aplica a RN28 ou a RN29 numa transação, com o motivo de sistema "Conta encerrada pela instituição", e revoga as sessões.
- **Frontend**
  - "Zona de perigo" no perfil.
  - Um diálogo que mostra quantos pedidos serão cancelados ou rejeitados e exige digitar uma confirmação.
  - Logout ao concluir.
- **Pronto quando:** a conta excluída não loga, some das listagens, e a outra parte ainda vê os pedidos históricos.

## Fase 5 — Painel administrativo

Todas as telas usam a tabela administrativa da 1.3, e toda escrita grava
auditoria.

### 5.1 `admin-administradores`

- Cadastrar, editar, excluir e listar administradores (RF29–RF32). A exclusão do último administrador é recusada (RN34).

### 5.2 `admin-instituicoes`

- Cadastrar uma instituição de qualquer tipo pelo painel (RF41, reaproveitando o service do cadastro).
- Editar, incluindo o campo deletado (RF44).
- Listar com a busca ampla, incluindo dados do responsável (RF47, RF57, RF58).
- Perfil completo somente leitura, com indicadores de atividade (RF48).

### 5.3 `admin-exclusoes-instituicoes`

- Exclusão lógica pelo admin, com escolha de motivo (RF42, RF43; reaproveita a lógica da 4.4).
- Exclusão permanente (RF45, RF46), na ordem de `docs/MODELO-DE-DADOS.md`, incluindo a remoção das imagens no MinIO depois do commit.

### 5.4 `admin-alimentos`

- Listar com todos os filtros (RF52).
- Detalhe com destaque para estabelecimento excluído (RF53).
- Editar (RF50, respeitando a RN20).
- Excluir permanentemente (RF51).

### 5.5 `admin-pedidos`

- Listar (RF55), detalhe somente leitura (RF56) e excluir permanentemente com alerta de irreversível (RF54). Nenhuma ação de status (RN13).

## Fase 6 — Automação

### 6.1 `expiracao-pedidos`

- Módulo `jobs` com `@nestjs/schedule`.
- Tarefa diária de expiração (RF72, RN11), também acessível pela rota de administrador.
- **Pronto quando:** pedidos com `orderDate` recuado no banco são cancelados com o motivo certo, e rodar duas vezes não muda nada.

### 6.2 `lembretes-whatsapp`

- **Backend:** `OrderReminder`, o cliente do webhook do n8n e as duas tarefas de lembrete (RF73, RF74), conforme `docs/INFRAESTRUTURA.md`. Com `N8N_WEBHOOK_URL` vazio, as tarefas só registram em log que estão desligadas.
- **Frontend:** o aviso da RN44 no cadastro e na edição do celular institucional.
- **Pronto quando:** com um fluxo de teste do n8n, cada lembrete chega uma única vez com o payload certo.

## Fase 7 — Qualidade e entrega

### 7.1 `revisao-visual`

- A revisão tela a tela contra o protótipo (`docs/PENDENCIAS.md`), agora com todas as telas prontas.
- Responsividade a 400 px (RNF01), tema claro e escuro, e console limpo.

### 7.2 `testes-casos-tcc`

- Executar os casos de teste do documento do TCC (CT01 em diante, já atualizados) e os cenários de concorrência da 3.1. Registrar o resultado.
- Corrigir o que falhar em changes `fix/`.

### 7.3 `deploy-producao`

- Ativar o ambiente de produção (`main`) com as variáveis de `docs/INFRAESTRUTURA.md`.
- Backups agendados do Postgres no Coolify.
- Incluir a produção no Gatus.
- Primeiro administrador criado pelo seed.

---

## Protótipo Pencil × versão final

Arquivo: `pencil-design-apresentacao.pen` (acesso pelo MCP `pencil`).

### Telas que entram agora (estavam fora no MVP)

- Todo o painel administrativo, **exceto** "Revisar Alimento".
- "Esqueci Minha Senha" (três telas).
- "Listar Instituições" e os perfis públicos, **sem** contato e sem endereço.
- "Meus Alimentos (Doador)".
- A etapa "Foto de perfil" do cadastro.
- O campo "Tipo de solicitação aceita" e as "Observações" no cadastro de alimento.
- Aba "Cancelado" e ação "Cancelar pedido".

### Continuam fora

| Elemento do protótipo | Motivo |
| --------------------- | ------ |
| "Revisar Alimento (Admin)" | Não há aprovação manual (DT16) |
| Botão/contato de WhatsApp no perfil público | O contato só aparece no pedido em andamento (RN12, RN36) |
| "Histórico do pedido" / linha do tempo | Nenhum RF |
| Seção "Solicitações para este alimento" no detalhe público | Nenhum RF |
| Passo "Categorias de alimentos" no cadastro da entidade | Nenhum RF |
| Dashboard do admin com gráficos | Nenhum RF. Opcional, só se sobrar tempo (`docs/PENDENCIAS.md`) |

### Regras que continuam valendo

- Nome do produto: sempre **"Food Share"**.
- O código é a fonte da verdade. Se uma tela divergir do protótipo por
  causa de um requisito, a divergência é registrada na change, e o
  protótipo não é redesenhado.

## Ambientes e como rodar

Ver `docs/INFRAESTRUTURA.md`. Para começar numa máquina nova:

1. `git clone` + `git switch develop`.
2. Ler o `CLAUDE.md` e os arquivos de `docs/` na ordem indicada.
3. `backend/`: `cp .env.example .env`, ajustar, `npm install`,
   `npx prisma migrate dev`, `npx prisma db seed`, `npm run start:dev`.
4. `frontend/`: `cp .env.example .env`, `npm install`, `npm run dev`.
5. Retomar do primeiro item ⬜ da tabela acima, com `/opsx:propose`.
