## 1. Backend: módulo `account-deletion`

- [x] 1.1 Criar `src/account-deletion/` (`account-deletion.module.ts`, `account-deletion.service.ts`) e importar o módulo em `EstablishmentsModule` e `BeneficiaryEntitiesModule`, com o `BETTER_AUTH` disponível para o service (design D3)
- [x] 1.2 `verifyPassword(userId, password)`: lê a `account` `credential` do usuário e confere com `(await auth.$context).password.verify`; falso ou sem senha → `400` com `code: INVALID_PASSWORD` (design D2). Constante do código junto das outras de erro
- [x] 1.3 `impactForEstablishment` e `impactForBeneficiaryEntity`: contagem de `Pendente` e `Em andamento` com `deleted = false`
- [x] 1.4 Helper do motivo de sistema: lê "Conta encerrada pela instituição" por `SYSTEM_CANCELLATION_REASON.ACCOUNT_CLOSED` com `isSystem = true` (`findUniqueOrThrow`)
- [x] 1.5 `closeEstablishment(tx, establishmentId, { cancellationReasonId, cancelledBy })` na ordem do design D4: trava do estabelecimento (`FOR UPDATE`, retorna se já excluído), trava dos alimentos não excluídos por id crescente, `Pendente` → `Rejeitado`, `Em andamento` → `Cancelado` sem devolver estoque, `deleted = true` nos alimentos e no estabelecimento
- [x] 1.6 `closeBeneficiaryEntity(tx, beneficiaryEntityId, { cancellationReasonId, cancelledBy })` na ordem do design D4: trava da entidade (retorna se já excluída), trava dos alimentos dos pedidos em aberto por id crescente, releitura dos pedidos, `Pendente` → `Cancelado`, cada `Em andamento` → `Cancelado` + `returnReservedQuantity`, `deleted = true` nos pedidos fora da exceção (`Doado`/`Cancelado` de estabelecimento não excluído) e na entidade
- [x] 1.7 `deleteOwnEstablishment(userId, password)` e `deleteOwnBeneficiaryEntity(userId, password)`: resolve a instituição pelo usuário (`404` se não houver), confere a senha antes da transação, e na transação chama o `close*` com o motivo de sistema e a parte (DT44), marca `user.deleted = true` e apaga as sessões do usuário

## 2. Backend: rotas

- [x] 2.1 `DeleteAccountDto { password }` (`@IsString`, `@IsNotEmpty`, `@MaxLength(128)`) e `DeletionImpactResponseDto { pendingOrders, inProgressOrders }`, com Swagger em pt-BR
- [x] 2.2 `EstablishmentsController`: `GET me/deletion-impact` e `DELETE me` (`204`), `@RequireRoles(...INSTITUTION_ROLES)`, declarados antes de `:id`; respostas documentadas (`400 INVALID_PASSWORD`, `401`, `403`, `404`)
- [x] 2.3 `BeneficiaryEntitiesController`: as mesmas duas rotas
- [x] 2.4 `OrdersService.create`: dentro da transação e antes do `lockFood`, `SELECT … FROM beneficiary_entity WHERE id = $1 AND deleted = false FOR SHARE`; sem linha → `404` (design D5)
- [x] 2.5 Cadastro de alimento: o mesmo `FOR SHARE` no estabelecimento, dentro da transação (design D5)

## 3. Backend: testes

- [x] 3.1 Spec do `AccountDeletionService` (estabelecimento): pendente → `Rejeitado`; em andamento → `Cancelado` com motivo de sistema e `ESTABLISHMENT`, sem mexer no estoque; alimentos de todos os status com `deleted = true` e status igual; `Doado`/`Cancelado` antigos intactos; pedidos não marcados como excluídos; usuário excluído e sessões apagadas
- [x] 3.2 Spec do `AccountDeletionService` (entidade): pendente e em andamento → `Cancelado` com `BENEFICIARY_ENTITY`; estoque devolvido; `Reservado` → `Ativo`; pedido total pendente de outra entidade acompanha o estoque (DT32); alimento excluído não recebe estoque; exceção do `deleted` (Doado/Cancelado de estabelecimento ativo ficam, `Rejeitado` e pedidos de estabelecimento excluído somem)
- [x] 3.3 Senha errada → `400 INVALID_PASSWORD` sem nenhuma escrita; segunda exclusão sobre instituição já excluída não altera nada
- [x] 3.4 Specs dos controllers/rotas: `204`, `400` sem senha e com campo a mais, `403` para administrador, `404` para o tipo errado, impacto com as contagens certas
- [x] 3.5 `npm run lint`, `npx tsc --noEmit` e `npm test` no backend sem erro, incluindo os testes de concorrência existentes de pedidos e alimentos

## 4. Frontend: API e sessão

- [x] 4.1 `profile-api.ts`: `getDeletionImpact(role)` e `deleteMyAccount(role, password)` com o prefixo por papel já usado no arquivo
- [x] 4.2 `AuthProvider`/`auth-context.ts`: `endSession()` que faz `queryClient.clear()` e `reset()` sem chamar `/sign-out` (design D6)

## 5. Frontend: Zona de perigo

- [x] 5.1 `danger-zone.tsx`: `Card` com borda `destructive`, título "Zona de perigo", texto curto e botão "Excluir conta" (`variant="destructive"`, `rounded-md`), no fim da `ProfilePage`, no modo de visualização e no de edição
- [x] 5.2 `delete-account-dialog.tsx` (`Dialog`): impacto buscado ao abrir, com skeleton e erro; texto por papel (estabelecimento: "N pedidos pendentes serão rejeitados", "N pedidos em andamento serão cancelados", alimentos saem do ar; entidade: "N pedidos pendentes e N em andamento serão cancelados", quantidades voltam aos estabelecimentos; "Você não tem pedidos em aberto." quando zero), singular/plural, aviso de que não pode ser desfeito e de que e-mail, CNPJ e celulares continuam vinculados; nada de "administrador"
- [x] 5.3 Form RHF + zod com `mode: 'onChange'`: campo "Digite EXCLUIR para confirmar" (exato, maiúsculas) e campo de senha; botão "Excluir conta" desabilitado até o form ser válido e durante o envio; diálogo não fecha durante o envio
- [x] 5.4 Erro `INVALID_PASSWORD` → "Senha incorreta." no campo de senha; outro erro → toast genérico com o diálogo aberto; sucesso → `endSession()`, `navigate('/login', { replace: true })` e toast "Sua conta foi excluída." no azul do Food Share
- [x] 5.5 `npm run lint` e `npx tsc -b` no frontend sem erro

## 6. Documentação

- [x] 6.1 `docs/REQUISITOS.md`: acrescentar a DT44 (`cancelledBy` da autoexclusão é a parte que encerrou a conta) e a DT45 (confirmação com "EXCLUIR" na tela + senha conferida no servidor, `400 INVALID_PASSWORD` sem derrubar a sessão); citar as duas na observação do RF04 e do RF05; na DT33, citar a DT44 como o valor do RF04 e do RF05
- [x] 6.2 `docs/MODELO-DE-DADOS.md`: na nota do `cancelledBy` (3.2), registrar que a 4.4 grava `ESTABLISHMENT` ou `BENEFICIARY_ENTITY` (DT44)

## 7. Verificação ponta a ponta e fechamento

- [x] 7.1 Pela API (curl ou Scalar), com contas de teste novas: impacto com as contagens certas; `DELETE` com senha errada → `400 INVALID_PASSWORD` e a sessão segue valendo; sem corpo → `400`; administrador → `403`; senha não aparece no `access_log`
- [x] 7.2 Estabelecimento com um pedido `Pendente`, um `Em andamento`, um `Doado` e alimentos `Ativo`, `Reservado` e `Inativo`: excluir a conta e conferir no banco os status, o motivo, o `cancelledBy`, o `deleted` dos alimentos, do estabelecimento e do usuário, e nenhuma linha em `session` do usuário; login recusado; some da listagem de estabelecimentos, do perfil público e do feed; a entidade ainda vê os três pedidos, com "O estabelecimento cancelou este pedido." e o motivo
- [x] 7.3 Entidade com um pedido `Pendente`, um `Em andamento` que deixou o alimento `Reservado`, um `Doado` e um `Rejeitado`: excluir a conta e conferir o alimento de volta a `Ativo` com o estoque devolvido, os cancelamentos com motivo e `BENEFICIARY_ENTITY`, o `deleted` só no `Rejeitado`, e o estabelecimento ainda vendo `Doado` e os cancelados com "A entidade cancelou este pedido."
- [x] 7.4 No navegador (dev), para os dois papéis: Zona de perigo no perfil; diálogo com o impacto; botão desabilitado com "excluir" minúsculo ou sem senha; senha errada mostra "Senha incorreta." e não desloga; exclusão concluída vai para o login com o toast; outra aba logada na mesma conta cai no login na próxima requisição; tela a 400 px sem rolagem horizontal, tema claro e escuro, sem erro no console além do `401` esperado do `/me`
- [x] 7.5 Marcar ✅ o item 4.4 em `docs/PLANO-IMPLEMENTACAO.md`
