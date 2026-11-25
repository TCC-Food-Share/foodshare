## 1. Backend: núcleo compartilhado e RN26

- [x] 1.1 Criar `src/institutions/` (`InstitutionsCoreModule`, sem controller) com `INSTITUTION_KIND` (`ESTABLISHMENT`, `BENEFICIARY_ENTITY`), o mapeamento tipo → papel → delegate do Prisma e a constante `INSTITUTION_UNIQUENESS_LOCK` (design D1, D3)
- [x] 1.2 `InstitutionUniquenessService.findConflicts(client, values, exclude?)`: `user.email`, `user.personalPhone` e `cnpj`/`institutionalEmail`/`institutionalPhone` nas duas tabelas, sem filtrar `deleted`, excluindo a própria instituição e o próprio usuário na edição; devolve os nomes reais dos campos (design D3)
- [x] 1.3 `InstitutionRegistrationService.register(kind, dto, image, hooks?)`: fluxo atual do `create` parametrizado pelo tipo, com conferência prévia, `store(USERS)`, `signUpEmail`, transação com `pg_advisory_xact_lock` + nova conferência + `Address` + instituição + `hooks.inTransaction`, e compensação (usuário e imagem) em qualquer falha (design D2, D3)
- [x] 1.4 `applyUpdate(tx, kind, institution, dto, newImageKey)`: updates de `user`, `address` e instituição só com os campos enviados (DT40 no nome fantasia), devolvendo `{ before, after }` dos campos que mudaram (design D2)
- [x] 1.5 `EstablishmentsService` e `BeneficiaryEntitiesService`: `create` e `update` delegam ao núcleo; a conferência passa a ser a cruzada (DT52), com a trava consultiva na transação quando a edição mexe em campo único; resposta pública de duplicidade mantida (`message` + `fields`, com `email`/`personalPhone` juntos em `personal`)
- [x] 1.6 `AccountDeletionService`: `closeEstablishment`/`closeBeneficiaryEntity` devolvem `{ closed, rejected, cancelled }` (autoexclusão ajustada para usar `closed`); `closeUser` público; `impactOf({ establishmentId } | { beneficiaryEntityId })` público (design D5)

## 2. Backend: módulo `admin/institutions` e listagem

- [x] 2.1 Criar `src/admin/institutions/` (`admin-institutions.module.ts`, `.controller.ts`, `.service.ts`, `institution-activity.ts`) e importar no `AdminModule`, com `AuditModule`, `FilesModule`, `AccountDeletionModule` e `InstitutionsCoreModule` (design D1)
- [x] 2.2 `institution.errors.ts`: `INSTITUTION_DATA_ALREADY_REGISTERED` (`409`, com `fields`), `CANCELLATION_REASON_REQUIRED`, `INVALID_CANCELLATION_REASON` e `CANCELLATION_REASON_WITHOUT_DELETE` (`400`) (design D7)
- [x] 2.3 DTOs com Swagger em pt-BR: query da listagem por `createAdminListQueryDto` com os `sort` do design D1 + `type` e `status` (`@IsIn`); `AdminUpdateInstitutionDto` estendendo o `Update*Dto` público com `deleted` (transform de `'true'`/`'false'`) e `cancellationReasonId`; `AdminInstitutionRowDto`, `AdminInstitutionProfileDto` (com `activity`), `AdminInstitutionFoodDto`, `AdminInstitutionOrderDto` e `DeletionImpactDto`
- [x] 2.4 `list(query)`: busca dos dois tipos com `select` só das colunas da linha, filtros `type` e `status`, `paginateInMemory` com `searchText` (campos do RF47/RF58, versões só com dígitos de CNPJ, celulares e CEP, data de cadastro `dd/MM/yyyy` em `America/Sao_Paulo`), desempate por tipo + id e ordem padrão `createdAt` desc; imagem por `toUrl`; nunca senha (design D4)
- [x] 2.5 Controller: `GET /admin/institutions` com respostas documentadas (`400`, `401`, `403`)
- [x] 2.6 `GET /admin/cancellation-reasons/options` no controller de motivos da 1.3, antes das rotas com `:id`: motivos sem `isSystem`, em ordem alfabética, `{ id, name }[]`, sem paginação

## 3. Backend: cadastro e perfil completo

- [x] 3.1 `create(actor, kind, dto, image)`: `register` com `hooks.inTransaction` gravando `establishment.create` ou `beneficiary_entity.create` (`{ companyName, cnpj, email }`); conflitos → `409 INSTITUTION_DATA_ALREADY_REGISTERED` com os campos reais; resposta `201` com o perfil completo (design D2, D8)
- [x] 3.2 `getProfile(kind, id)`: dados institucionais, endereço, responsável, `createdAt`, `deleted`, `emailVerified` e `activity` por `groupBy` (alimentos por status não excluídos + excluídos; pedidos por status, sem filtrar `deleted`); `404` para id de outro tipo ou inexistente (design D6)
- [x] 3.3 `listFoods(id, page)` (só estabelecimento) e `listOrders(kind, id, page)`: paginados, ordem por `publishedAt`/`orderDate` desc, incluindo excluídos, com nome do item do catálogo, sigla da unidade, nome da outra parte e status (design D6)
- [x] 3.4 Controller: `POST /admin/institutions/:kind` (`@ImageUpload({ body, required: true })` com o DTO público do tipo), `GET :kind/:id`, `GET establishments/:id/foods`, `GET :kind/:id/orders`, `GET :kind/:id/impact`, com `ParseEnumPipe`/`ParseIntPipe`, `sessionAdministrator(session)` e respostas documentadas

## 4. Backend: edição, exclusão lógica e restauração

- [x] 4.1 Validação antes da transação: `cancellationReasonId` sem `deleted = true` → `400 CANCELLATION_REASON_WITHOUT_DELETE`; `deleted = true` numa ativa sem motivo → `400 CANCELLATION_REASON_REQUIRED`; motivo inexistente ou de sistema → `400 INVALID_CANCELLATION_REASON`; conferência de unicidade dos campos enviados → `409` (design D5)
- [x] 4.2 `update(actor, kind, id, dto, image?)` na ordem do design D5: imagem nova antes; transação com trava consultiva quando mexe em campo único; `404`; exclusão primeiro (`closeX` com `ADMINISTRATOR` + `closeUser` + auditoria `soft_delete` com motivo e contagens, só se `closed`); restauração (`FOR UPDATE`, instituição e usuário `deleted = false`, auditoria `restore`, só se estava excluída); `applyUpdate` + auditoria `update` só se algo mudou; imagem antiga removida depois do commit, nova removida em erro; `P2002` → `409`
- [x] 4.3 Controller: `PATCH /admin/institutions/:kind/:id` (`@ImageUpload({ body: AdminUpdateInstitutionDto, required: false })`), resposta `200` com o perfil completo e respostas documentadas (`400`, `404`, `409`)

## 5. Backend: testes

- [x] 5.1 Specs do núcleo: unicidade cruzada (CNPJ de entidade no cadastro de estabelecimento e vice-versa; dado de instituição excluída; edição que exclui a própria instituição); specs públicos de `establishments` e `beneficiary-entities` continuam passando, mais os cenários novos da RN26
- [x] 5.2 Teste de concorrência no banco de teste: um estabelecimento e uma entidade com o mesmo CNPJ cadastrados ao mesmo tempo (`Promise.all`) → só um criado, sem usuário nem imagem órfã do outro
- [x] 5.3 Spec do service, listagem: os dois tipos, filtros de tipo e situação, busca sem acento pelo responsável, celular sem pontuação, data `05/11` com cadastro às 22h de Brasília, `emailVerified` na linha, ordem padrão e `sort` inválido
- [x] 5.4 Spec do service, cadastro e perfil: cadastro dos dois tipos com conta não confirmada e auditoria sem senha; e-mail de administrador → `409` com `email`; falha da auditoria apaga conta, endereço e imagem; indicadores contando excluídos; listas paginadas; `404` para tipo errado
- [x] 5.5 Spec do service, edição: parcial; nome fantasia vazio → `null`; troca de imagem remove a anterior só depois do commit; e-mail institucional de outro tipo → `409`; edição de excluída mantém `deleted`; auditoria só com o que mudou
- [x] 5.6 Spec do service, exclusão e restauração: estabelecimento (pendente → `Rejeitado`, em andamento → `Cancelado` com motivo e `ADMINISTRATOR`, alimentos excluídos, sessões apagadas, usuário `deleted`); entidade (pendente e em andamento → `Cancelado`, estoque devolvido e alimento `Reservado` → `Ativo`, pedidos totais pendentes ajustados, histórico com estabelecimento ativo preservado); sem motivo, motivo de sistema e motivo sem `deleted` → `400` sem mudança; instituição já excluída → nada refeito; restauração sem mexer em alimentos e pedidos e login liberado; `deleted = false` em ativa → sem auditoria
- [x] 5.7 Specs das rotas: `401` sem sessão, `403 ROLE_NOT_ALLOWED` para instituição, `400` com `cnpj`, `email` ou `companyName` no `PATCH`, `400` sem imagem no `POST`, tipo inválido no caminho → `400`, `pageSize=30` → `400`; `options` sem motivos de sistema
- [x] 5.8 `npm run lint`, `npx tsc --noEmit` e `npm test` no backend sem erro

## 6. Frontend: API e listagem

- [x] 6.1 `features/admin/institutions/institution-kind.ts` (slug `estabelecimentos`/`entidades` ↔ segmento da API ↔ rótulo) e `institutions-api.ts` (tipos, `list`, `get`, `create`, `update` com `toFormData`, `impact`, `foods`, `orders`, `cancellationReasonOptions`; mensagens por `code`; mapa de `fields` → campo do formulário)
- [x] 6.2 `admin-institutions-page.tsx`: título, descrição, botão "Nova instituição", `AdminTable` com `useAdminListParams` e os filtros de tipo e situação no `toolbar` (estado na URL; `Select` com `field.value` direto, sem `|| undefined`); colunas tipo, imagem (`UserAvatar`), nome, CNPJ, responsável (nome, e-mail, celular), cidade/UF, data de cadastro e situação com os selos "Excluída" e "Aguardando confirmação"; ações "Ver perfil" e "Editar"
- [x] 6.3 Registrar em `ADMIN_LIST_PAGES['/admin/instituicoes']` e criar as rotas `/admin/instituicoes/nova`, `/admin/instituicoes/:slug/:id` e `/admin/instituicoes/:slug/:id/editar` no layout do painel; slug inválido leva à listagem

## 7. Frontend: cadastro, perfil e edição

- [x] 7.1 `admin-institution-create-page.tsx`: `RadioGroup` de tipo; um `FormProvider` com o `signUpSchema` (imagem obrigatória) e `mode: 'onChange'`, renderizando em sequência `ResponsibleStep`, `InstitutionalStep`, `AddressStep` e `ProfilePhotoStep` como seções; botão de submit único e fixo `type="submit"`
- [x] 7.2 Erros do cadastro: `INSTITUTION_DATA_ALREADY_REGISTERED` nos campos de `fields`, `PROHIBITED_CONTENT` pelos `prohibitedContentFields`, erro de imagem no campo de imagem, outros em toast com os dados mantidos; sucesso → toast longo com o aviso do código e das 24 horas, invalida a listagem e abre o perfil criado
- [x] 7.3 `admin-institution-profile-page.tsx`: cards de dados institucionais (com imagem), responsável, endereço e situação; cards de indicadores (DT51) com os rótulos de status centralizados; tabelas paginadas de alimentos (só estabelecimento) e de pedidos, com `PageSizeSelect` e `PaginationBar`; ação "Editar"; tela a 400 px sem rolagem horizontal
- [x] 7.4 `admin-institution-edit-page.tsx`: campos do RF44 preenchidos, e-mail pessoal, CNPJ e razão social somente leitura, `ImagePicker`, diff com os valores iniciais e "Salvar" desabilitado sem mudança; erros de campo como no cadastro
- [x] 7.5 Bloco "Situação da conta" na edição: `RadioGroup` "Ativa"/"Excluída logicamente"; escolher a exclusão numa ativa busca o impacto (rejeitados/cancelados conforme o tipo) e exige o motivo (`SearchableSelect` com `options`); voltar para "Ativa" numa excluída mostra o aviso de que alimentos continuam excluídos e pedidos não voltam; sucesso → toast, invalida listagem e perfil, volta ao perfil
- [x] 7.6 `npm run lint` e `npx tsc -b` no frontend sem erro

## 8. Documentação

- [x] 8.1 `docs/REQUISITOS.md`: acrescentar a DT49 (exclusão lógica pelo campo deletado), a DT50 (restauração), a DT51 (indicadores e listas do perfil completo), a DT52 (RN26 entre os dois tipos, contando excluídas) e a DT53 (listagem única com filtros, busca por data e dígitos, selos); citar DT49/DT50 no RF44, DT51 no RF48, DT53 no RF47 e DT52 no RF41/RF44 e na RN26
- [x] 8.2 `docs/PLANO-IMPLEMENTACAO.md`: texto da 5.3 passa a dizer que a exclusão lógica pelo administrador já existe pela edição (DT49) e que a 5.3 entrega a ação "Excluir" dedicada (reaproveitando a mesma operação) e a exclusão permanente
- [x] 8.3 Conferir que o `.env.example` não precisa de variável nova (nenhuma prevista)

## 9. Verificação ponta a ponta e fechamento

- [x] 9.1 No banco local e no do staging, conferir se já existe CNPJ, e-mail institucional ou celular institucional repetido entre `establishment` e `beneficiary_entity` (consulta com `INTERSECT`); se existir, avisar a dupla antes do deploy (design, Migration Plan) — local sem repetidos; staging dispensado pela dupla, porque o banco pode ser resetado a qualquer momento
- [x] 9.2 Pela API (curl com `--form-string` nos campos de texto, ou Scalar): cadastro de estabelecimento e de entidade pelo painel → `201` e código no Resend/log; CNPJ de uma no cadastro da outra → `409` (painel) e duplicidade no cadastro público; login antes de confirmar → `403 EMAIL_NOT_VERIFIED`; senha ausente em `audit_log` e `access_log`
- [x] 9.3 Exclusão pelo `PATCH` com a instituição logada em outra janela: pedidos mudam como na RN28/RN29 com "Nossa equipe cancelou este pedido." para a outra parte; a janela da instituição cai no login; o login volta a funcionar depois da restauração, com alimentos ainda excluídos
- [x] 9.4 No navegador (dev): seção "Instituições" com busca, filtros, ordenação e itens por página; selos; cadastro com tipo, CEP preenchendo o endereço e cidade por UF; perfil com indicadores e tabelas; edição com campos fixos, diff, exclusão com impacto e motivo, e restauração; tela a 400 px sem rolagem horizontal, tema claro e escuro, sem erro no console além do `401` esperado do `/me`
- [x] 9.5 Marcar ✅ o item 5.2 em `docs/PLANO-IMPLEMENTACAO.md`
