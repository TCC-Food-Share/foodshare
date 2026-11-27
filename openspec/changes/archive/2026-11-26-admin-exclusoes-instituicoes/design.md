## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/admin/instituicoes`. O que existe hoje e molda a solução:

- `AdminInstitutionsService.update` (5.2) aplica a exclusão lógica e a restauração pelo campo `deleted`, dentro da
  transação de `InstitutionRegistrationService.update`: advisory lock de unicidade (DT52) → `beforeUpdate`
  (`closeEstablishment`/`closeBeneficiaryEntity` ou `restore`, que travam a instituição `FOR UPDATE`) → updates dos
  campos → `afterUpdate` (auditoria). `impact(kind, id)` e `GET /admin/cancellation-reasons/options` já existem.
- `institution-locks.ts` define a ordem de travas da 4.4: instituição → alimentos (id crescente) → pedidos. Os fluxos
  de criação travam a instituição viva com `FOR SHARE` (`deleted = false`), então nada novo nasce numa instituição
  excluída logicamente.
- Exclusões permanentes já feitas no código: a tarefa da RN48 (`UnverifiedAccountsCleanupService.deleteAccount`) e a
  exclusão de administrador (5.1). As duas apagam os códigos em `verification` pelos identificadores
  `email-verification-otp-<email>` e `forget-password-otp-<email>`, apagam o usuário (sessões e contas em cascata) e
  chamam `ImageStorageService.removeQuietly` depois do commit.
- Schema: nenhuma relação de `Order`, `Food`, `Establishment`, `BeneficiaryEntity`, `Address` e `Suggestion.requester`
  tem cascade. `AuditLog.administratorId` e `AccessLog.userId` são `SetNull`; `Session` e `Account` são `Cascade`.
- Frontend: a edição (`admin-institution-edit-page.tsx`) já busca o impacto e os motivos e monta o texto do impacto
  por tipo. A listagem usa `rowActions` da `AdminTable`; o perfil tem só "Editar". O diálogo de exclusão de
  administrador (`delete-administrator-dialog.tsx`) é o padrão visual de diálogo destrutivo do painel.

## Goals / Non-Goals

**Goals:**

- Exclusão permanente atômica, na ordem do `MODELO-DE-DADOS.md`, sem corrida com a restauração nem com outra exclusão.
- Ação "Excluir" fora da edição, sem duplicar a regra: o backend da exclusão lógica não muda.
- Imagens apagadas só depois do commit, nunca antes.

**Non-Goals:**

- Rota dedicada de exclusão lógica (`POST .../soft-delete`): a `PATCH` da 5.2 já cobre (ver Decisão 1).
- Extrair um serviço genérico de "apagar conta" para a RN48, a 5.1 e esta change. As três apagam coisas diferentes;
  só o trecho de códigos de verificação é igual (ver Decisão 4).
- Fila ou nova tentativa para imagem que falhou ao ser apagada: fica o log de erro, como na 0.3.

## Decisions

### 1. Ação "Excluir" reaproveita a `PATCH` da 5.2

O diálogo chama `institutionsApi.update(kind, id, { deleted: true, cancellationReasonId }, null)`. A DT49 já diz que a
ação dedicada reaproveita a mesma operação, e a `PATCH` só com esses dois campos não toca nos outros (edição parcial),
grava `soft_delete` e é idempotente para instituição já excluída (devolve o perfil com `deleted = true`, que a tela
mostra sem erro, como pede a spec).

Alternativa: `POST /admin/institutions/{tipo}/:id/soft-delete`. Mais explícita no Scalar, mas seria uma segunda porta
para a mesma regra, com validação e testes duplicados.

### 2. Rota `DELETE /admin/institutions/:kind/:id`

- Controller: `@Delete(':kind/:id')`, `@HttpCode(204)`, `ParseKindSegmentPipe` + `ParseIntPipe`,
  `sessionAdministrator(session)`. Docs: `204`, `401`, `404`, `409` (`INSTITUTION_NOT_SOFT_DELETED`).
- Erro novo em `institution.errors.ts`: `institutionNotSoftDeleted()` → `409` com
  `{ code: 'INSTITUTION_NOT_SOFT_DELETED', message }`.
- Service: `remove(actor, kind, id)`.

### 3. Transação da exclusão permanente

```
$transaction:
  lockEstablishmentForUpdate / lockBeneficiaryEntityForUpdate   (instituição FOR UPDATE)
    null           → 404
    deleted=false  → 409 INSTITUTION_NOT_SOFT_DELETED
  lê: userId, addressId, companyName, cnpj, user.email, user.image
      (estabelecimento) ids e chaves de imagem dos alimentos, de todos, excluídos ou não
  SELECT id FROM "order" WHERE <dono> ORDER BY id FOR UPDATE      (pedidos em ordem de id)
  order.deleteMany   estabelecimento: foodId IN (alimentos) OR establishmentId = id
                     entidade:        beneficiaryEntityId = id
  food.deleteMany    (só estabelecimento)
  suggestion.deleteMany { requesterId: userId }
  establishment|beneficiaryEntity.delete → address.delete
  verification.deleteMany (identificadores do e-mail pessoal)
  user.delete                        (Session e Account em cascata; AccessLog vira NULL)
  audit.record  <prefixo>.delete, details { companyName, cnpj, deletedFoods, deletedOrders, deletedSuggestions }
depois do commit: removeQuietly(user.image), removeQuietly(cada imagem de alimento)
```

- **Por que a trava da instituição basta para a regra:** com `deleted = true`, todos os pedidos já estão em estado
  final (RN28/RN29) e nenhum fluxo de criação passa da trava `FOR SHARE` de instituição viva. Os pedidos finais não
  mudam de status, e a exclusão de alimento pelo estabelecimento ou o aceite só tocam pedidos em aberto. Então nada
  compete com a exclusão pelos mesmos pedidos, e nenhum estoque de outro alimento muda (a spec pede isso).
- **Por que travar os pedidos em ordem de id:** as exclusões permanentes de alimento (5.4) e de pedido (5.5) também
  vão apagar pedidos em lote. Travar em ordem de id antes do `deleteMany` evita impasse entre duas exclusões que se
  cruzam nos mesmos pedidos (mesmo motivo do `lockFoods` da 4.4). Custa uma consulta.
- **Os pedidos do estabelecimento:** `foodId IN (...) OR establishmentId = id` cobre "pedidos dos alimentos → pedidos
  restantes" do `MODELO-DE-DADOS.md` num único lote. Por construção, todo pedido de um alimento tem o
  `establishmentId` do dono, mas a condição dupla não depende disso.
- **Sem advisory lock de unicidade:** apagar só libera CNPJ, e-mails e celulares; um cadastro concorrente que ainda vê o
  valor antigo recebe `409` e pode tentar de novo. Não travar evita colocar mais uma trava na frente da exclusão.
- **Contagens da auditoria (DT56)** vêm do `count` de cada `deleteMany`. Razão social e CNPJ são lidos antes de
  apagar. O `entityId` é o id da instituição, como nas outras ações; a linha sobrevive porque `AuditLog` não tem FK
  para a instituição.
- **Imagens:** coletadas dentro da transação e removidas só depois do commit, com `removeQuietly` (falha vira log e não
  desfaz nada). Se a transação falha, nenhuma é removida.

### 4. Códigos de verificação: helper compartilhado

A RN48, a 5.1 e esta change montam os mesmos dois identificadores do better-auth. Esta change extrai
`deleteVerificationCodes(tx, email)` para `auth/` (ou junto do módulo `institutions/`), usado pelos três. É a única
parte comum que vale extrair; o resto de cada exclusão é diferente.

Alternativa: copiar os identificadores de novo. Funciona, mas uma troca de prefixo no better-auth teria de ser
lembrada em três lugares.

### 5. Restauração concorrente responde `404`

A `PATCH` da 5.2 lê a instituição (`require`) fora da transação. Se a exclusão permanente commitar entre essa leitura e
a transação, hoje o `restore` não acha a linha e o update dos campos falha com `P2025` (vira `500`). Para cumprir a
spec ("a restauração responde `404`"), o `beforeUpdate` do admin passa a sempre travar a instituição `FOR UPDATE`
(não só na exclusão e na restauração) e lança `institutionNotFound()` se ela sumiu. Mantém a ordem de travas (a
instituição é a primeira linha de instituição travada; o advisory lock de unicidade vem antes, como já é).

Se a restauração ganhar a corrida, a exclusão permanente encontra `deleted = false` e responde `409`.

### 6. Frontend

- `institutionsApi.remove(kind, id)` → `api.delete`. Mensagens por `code` num mapa
  `INSTITUTION_ERROR_MESSAGES` (`INSTITUTION_NOT_SOFT_DELETED`: "Esta instituição não está mais excluída. Atualize a
  página.").
- **`SoftDeleteImpactFields`** (nome provisório): extrai da edição o trecho de impacto (queries `impact` e
  `cancellationReasonOptions`, texto por tipo) e o select de motivo. A edição e o diálogo novo usam o mesmo
  componente, então o texto do impacto não diverge.
- **`SoftDeleteInstitutionDialog`**: título "Excluir instituição?", o componente acima, botão destrutivo habilitado só
  com motivo. Sucesso: toast, `invalidateQueries(INSTITUTIONS_QUERY_KEY)` (listagem, perfil e impacto), fecha.
- **`DeleteInstitutionPermanentlyDialog`**: padrão visual do diálogo de administrador; nome público, alerta de
  irreversível, contagens e campo de confirmação. As contagens vêm do `activity` do perfil
  (`institutionsApi.get`, já em cache quando aberto pelo perfil): alimentos = ativos + reservados + inativos +
  excluídos; pedidos = soma dos status. O botão compara o texto com `'EXCLUIR'` exatamente (DT55). Sucesso: toast,
  no perfil `navigate('/admin/instituicoes')`, `removeQueries` só das consultas de detalhe **inativas** (remover a do
  perfil ainda montado o faria buscar de novo e receber `404`) e `invalidateQueries` da listagem; na listagem, só
  fecha (os parâmetros da URL ficam).
- **Listagem:** `rowActions` ganha um terceiro botão ícone, `Trash2Icon`, com rótulo acessível "Excluir …" na linha
  ativa e "Excluir permanentemente …" na excluída (só um aparece por linha). O estado do diálogo (alvo e tipo) fica na
  página.
- **Perfil:** ao lado de "Editar", botão destrutivo "Excluir" ou "Excluir permanentemente" conforme `deleted`. O erro
  `404` da query mostra "Instituição não encontrada" com link para a listagem, em vez do erro genérico.

Alternativa para as contagens: rota `GET .../deletion-summary`. Descartada: o perfil já traz as contagens por status,
com os excluídos logicamente, que é exatamente o que será apagado (o número de sugestões vai só para a auditoria).

## Risks / Trade-offs

- [A tarefa da RN48 trava usuário → instituição; a exclusão permanente trava instituição → usuário] → Só colidem se o
  administrador apagar uma instituição não confirmada no mesmo instante em que a tarefa a apaga. O Postgres detecta o
  impasse e aborta uma das duas: a tarefa registra o erro e tenta na hora seguinte; o administrador vê o erro e, ao
  tentar de novo, recebe `404`. Não vale inverter a ordem da 4.4 por isso.
- [Imagem que falha ao ser apagada fica órfã no MinIO] → `removeQuietly` registra o erro com a chave; mesmo
  comportamento da troca de imagem (0.3) e da RN48.
- [Estabelecimento com muitos alimentos e pedidos deixa a transação longa] → Os volumes de um TCC são pequenos, e as
  travas tomadas só competem com fluxos que já não acontecem numa instituição excluída. Aceito.
- [O histórico de pedidos do outro lado some (a entidade apagada leva os `Doado` que o estabelecimento via)] → É o que
  o RF46 pede. O diálogo diz quantos pedidos serão apagados antes de confirmar.
- [A contagem de pedidos do diálogo pode ficar desatualizada se um pedido mudar enquanto ele está aberto] → Numa
  instituição excluída logicamente nada novo acontece com os pedidos (Decisão 3); a contagem só muda por outra
  exclusão do administrador. Aceito.

## Migration Plan

Sem migration e sem variável nova. Deploy comum do backend e do frontend; não precisa reset do staging. Rollback:
reverter o merge (a rota nova some e nada no banco depende dela).
