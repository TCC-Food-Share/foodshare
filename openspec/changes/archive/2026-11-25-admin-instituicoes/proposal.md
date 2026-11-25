## Why

A seção "Instituições" do painel ainda é um aviso de "em construção". Sem ela, o administrador não consegue cadastrar
uma instituição por conta de alguém, corrigir um dado cadastral, ver quem é o responsável por um cadastro nem tirar
do ar uma instituição problemática. É o item 5.2 do plano, que depende da 5.1 (`admin-administradores`) e da 4.4
(`exclusao-propria-conta`), as duas já em `develop`, e destrava a 5.3.

## What Changes

Cobre **RF41, RF44, RF47, RF48, RF57 e RF58**, com as decisões novas **DT49 a DT53** (abaixo). Usa a RN26, a RN27,
a RN28, a RN29, a RN30, a RN35, a RN36, a RN41, a RN46, a RN47, a RN48, a DT24, a DT39, a DT40 e a DT44, que já
valem.

### Backend

- Controller novo `@AdminController('institutions')`:
  - **Listar (RF47, RF57, RF58):** `GET /admin/institutions`, paginado (DT23), com estabelecimentos e entidades juntos,
    filtros de tipo e de situação (ativas/excluídas), busca única por todos os campos do RF47 (inclusive os dados do
    responsável e a data de cadastro em `dd/mm/aaaa`) e ordenação por campo. Cada linha traz tipo, id, imagem, razão
    social, nome fantasia, CNPJ, contatos institucionais, nome, e-mail e celular do responsável, cidade, UF, data de
    cadastro, `deleted` e `emailVerified`. Nunca a senha.
  - **Cadastrar (RF41):** `POST /admin/institutions/establishments` e `POST /admin/institutions/beneficiary-entities`,
    multipart com todos os campos do cadastro público e imagem obrigatória (`@ImageUpload()`, pasta `users`). Usa o
    mesmo service do cadastro público: a conta nasce não confirmada, recebe o código (DT39) e é apagada se não
    confirmar em 24 horas (RN48). Nome fantasia e descrição usam `@NoProhibitedContent()` (DT24).
  - **Perfil completo (RF48, RF57):** `GET /admin/institutions/{tipo}/:id` com dados institucionais, endereço, dados
    do responsável, data de cadastro, `deleted`, `emailVerified` e indicadores de atividade (DT51); e
    `GET .../:id/foods` (só estabelecimento) e `GET .../:id/orders`, paginados, para as listas do perfil.
  - **Editar (RF44):** `PATCH /admin/institutions/{tipo}/:id`, multipart parcial com os campos do RF44. E-mail pessoal,
    CNPJ e razão social são recusados (RN27). O nome fantasia pode ser apagado (DT40). A troca de imagem apaga a
    anterior depois do commit (padrão da 0.3).
  - **Campo deletado na edição:** `deleted: true` exige `cancellationReasonId` (motivo da lista, nunca de sistema) e
    aplica, na mesma transação, a exclusão lógica da RN28 ou da RN29 com `cancelledBy = ADMINISTRATOR` (DT44, DT49),
    revogando as sessões. `deleted: false` numa instituição excluída a restaura (DT50).
  - **Impacto:** `GET /admin/institutions/{tipo}/:id/impact`, com quantos pedidos pendentes e em andamento a exclusão
    afetaria (RN28).
- Rota nova `GET /admin/cancellation-reasons/options`: motivos que o administrador pode escolher, sem os de sistema e
  sem paginação, para o select da exclusão.
- **RN26 em todos os cadastros (DT52):** CNPJ, e-mail institucional e celular institucional passam a ser conferidos
  entre estabelecimentos **e** entidades, no cadastro público, na edição do próprio perfil e nas rotas do
  administrador, com trava contra cadastros concorrentes. Hoje a conferência só olha a tabela do próprio tipo.
- Auditoria (RN46) de cada escrita na mesma transação: `establishment.create`, `establishment.update`,
  `establishment.soft_delete`, `establishment.restore` e os equivalentes `beneficiary_entity.*`, nunca com a senha.

### Frontend

- A seção **Instituições** sai do "em construção" e passa a usar a tabela administrativa da 1.3, com filtros de tipo
  e situação, colunas com os dados do responsável (RF57) e os selos "Excluída" e "Aguardando confirmação" (DT53).
- **"Nova instituição"** (`/admin/instituicoes/nova`): escolha do tipo primeiro e, depois, um formulário único com
  dados do responsável, dados institucionais, endereço (CEP que preenche o endereço, cidade por UF) e imagem. Ao
  concluir, o aviso do código de confirmação e das 24 horas.
- **Perfil completo** (`/admin/instituicoes/{estabelecimentos|entidades}/:id`), somente leitura: blocos separados de
  dados institucionais e do responsável, endereço, situação, indicadores e as tabelas de alimentos e pedidos.
- **Editar** (`.../:id/editar`): campos do RF44, com e-mail pessoal, CNPJ e razão social somente leitura, e o bloco
  "Situação da conta": excluir logicamente (motivo obrigatório e impacto antes de salvar) ou restaurar.

### Documentação

- `docs/REQUISITOS.md`: DT49 a DT53 novas, citadas nas observações do RF41, RF44, RF47 e RF48.
- `docs/PLANO-IMPLEMENTACAO.md`: item 5.2 marcado ✅ ao fim; o texto da 5.3 passa a dizer que a exclusão lógica pelo
  administrador já existe (DT49) e que a 5.3 entrega a ação "Excluir" dedicada e a exclusão permanente.

**Decisões tomadas com a dupla antes da proposta:**

- **DT49:** marcar "deletado" na edição pelo administrador (RF44) aplica na hora a exclusão lógica da RN28 ou da
  RN29, com motivo escolhido da lista (RN30), impacto mostrado antes e `cancelledBy = ADMINISTRATOR` (DT44). A 5.3
  reaproveita a mesma operação na ação "Excluir" (RF42, RF43).
- **DT50:** desmarcar "deletado" restaura a instituição: ela e o usuário voltam a `deleted = false`, e a conta volta a
  logar. Os alimentos continuam excluídos (RN24), e os pedidos ficam como estão (os cancelados e rejeitados não
  voltam, e os pedidos da entidade escondidos pela RN29 continuam escondidos).
- **DT51:** indicadores do perfil completo (RF48): estabelecimento, alimentos por status (`Ativo`, `Reservado`,
  `Inativo`) e excluídos, e pedidos recebidos por status; entidade, pedidos feitos por status. Abaixo, tabelas
  paginadas e somente leitura dos alimentos (só estabelecimento) e dos pedidos da instituição, sem link (as seções da
  5.4 e da 5.5 ainda não existem).
- **DT52:** a RN26 vale entre as duas tabelas (estabelecimento e entidade) em todo cadastro e edição, público ou do
  administrador, e conta também as instituições excluídas logicamente. Isso corrige o código atual, que só confere a
  tabela do próprio tipo. Onde o RF44 fala em "instituições ativas", vale a RN26 ("todas").

**Proposta desta change, para confirmar na revisão:**

- **DT53:** a listagem (RF47) é uma seção única, "Instituições", com filtros de tipo (todos, estabelecimentos,
  entidades) e de situação (todas, ativas, excluídas), que cobre o "deletado" do RF47. A data de cadastro é buscada
  em `dd/mm/aaaa`, completa ou parcial, no fuso de Brasília (como na DT34). CNPJ, celulares e CEP casam com ou sem
  pontuação. A ordem padrão é a data de cadastro mais recente primeiro. Como na DT48, a linha mostra "Aguardando
  confirmação" para quem ainda não confirmou o e-mail, e "Excluída" para quem tem `deleted = true`.

### Pergunta em aberto

- A RN26 diz que a mensagem de duplicidade é genérica, mas as specs do cadastro público (`estabelecimentos/cadastro`,
  `entidades-beneficiarias/cadastro`) indicam qual campo institucional colidiu e só escondem o dado pessoal. Esta
  change **mantém o formato atual** no cadastro público e só estende a conferência à outra tabela. Nas rotas do
  administrador, que não são anônimas, a resposta indica cada campo, inclusive e-mail e celular pessoal. Se a dupla
  quiser a mensagem totalmente genérica no público, fica para uma correção própria.

### Fora desta change

- Ação "Excluir" dedicada na listagem e exclusão permanente (RF42, RF43, RF45, RF46): 5.3. A lógica da exclusão lógica
  pelo administrador entra aqui, pelo campo "deletado" (DT49).
- Edição, detalhe e exclusão de alimentos pelo painel (RF50–RF53): 5.4. Detalhe e exclusão de pedidos (RF54–RF56):
  5.5. As tabelas do perfil completo não levam a essas telas.
- Trocar a senha de uma instituição pelo painel: o RF44 não inclui senha; a instituição usa a recuperação (RF08).
- Reenviar o código de confirmação pelo painel: a instituição pede pela tela de confirmação (RF75).
- Avisar a instituição por e-mail sobre exclusão ou restauração: fora do escopo (RN45).

## Capabilities

### New Capabilities

- `admin/instituicoes`: listagem, cadastro, perfil completo, edição (com exclusão lógica e restauração pelo campo
  "deletado") de estabelecimentos e entidades pelo painel (RF41, RF44, RF47, RF48, RF57, RF58, DT49–DT53), com a
  auditoria de cada escrita e as telas da seção "Instituições".

### Modified Capabilities

- `admin/painel`: a seção "Instituições" deixa de ser "em construção" e passa a mostrar a gestão de instituições.
- `auth/confirmacao-email`: o requisito do código enviado no cadastro ganha o cenário da instituição cadastrada pelo
  painel (DT39).
- `estabelecimentos/cadastro`: a unicidade passa a conferir CNPJ, e-mail e celular institucionais também contra as
  entidades beneficiárias (RN26, DT52).
- `entidades-beneficiarias/cadastro`: a unicidade passa a conferir CNPJ, e-mail e celular institucionais também contra
  os estabelecimentos (RN26, DT52).

As specs de edição do próprio perfil (`estabelecimentos/edicao-cadastro`, `entidades-beneficiarias/edicao-cadastro`)
já exigem a conferência contra "outro estabelecimento ou entidade"; só o código não cumpre, e esta change o corrige
sem mudar a spec.

## Impact

- **Backend:** módulo novo `admin/institutions` (controller, service, DTOs, consultas de perfil e indicadores),
  registrado no `AdminModule`. Refatoração do cadastro e da edição de `establishments/` e `beneficiary-entities/` para
  um núcleo compartilhado com o painel, e helper novo de unicidade entre os dois tipos (RN26). `AccountDeletionService`
  passa a expor o impacto por id de instituição e o encerramento das sessões. Rota `options` nova em
  `admin/lists/cancellation-reasons`.
- **Frontend:** `features/admin/institutions/` (listagem, cadastro, perfil, edição), rotas novas sob
  `/admin/instituicoes`, reaproveitando `AdminTable`, `useAdminListParams`, `ImagePicker`, `CityAutocomplete`, as
  máscaras e o preenchimento por CEP do cadastro público.
- **Banco:** sem migration.
- **Sem variável de ambiente nova.**
