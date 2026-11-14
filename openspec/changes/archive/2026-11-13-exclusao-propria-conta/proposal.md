## Why

Hoje uma instituição que deixa de usar o Food Share não tem como sair: a conta continua no feed, na listagem de
instituições e com pedidos em aberto que ninguém vai atender. O RF04 e o RF05 pedem a exclusão lógica da própria
conta, com os efeitos da RN28 (estabelecimento) e da RN29 (entidade) e o motivo de sistema da RN30. É o item 4.4 do
plano, que depende da 3.2 (`cancelar-pedido`, já em `develop`), de onde vêm o motivo de cancelamento, o
`cancelledBy` e a devolução do estoque. A 5.3 (`admin-exclusoes-instituicoes`) reaproveita a mesma lógica.

## What Changes

Cobre **RF04, RF05, RN28, RN29 e RN30**, com as decisões novas **DT44 e DT45** (abaixo). Usa a RN09, a RN31, a
RN32, a DT27 e a DT32, que já valem.

### Backend

- **Impacto antes de excluir:** `GET /establishments/me/deletion-impact` e `GET /beneficiary-entities/me/deletion-impact`
  devolvem quantos pedidos `Pendente` e `Em andamento` a conta tem, para a tela avisar antes (RN28).
- **Exclusão:** `DELETE /establishments/me` e `DELETE /beneficiary-entities/me`, com a senha da conta no corpo
  (DT45). Senha errada responde `400` com `code: INVALID_PASSWORD` e não muda nada. Senha certa aplica, numa única
  transação:
  - **Estabelecimento (RN28):** pedidos `Pendente` → `Rejeitado`; pedidos `Em andamento` → `Cancelado`, com o motivo
    de sistema "Conta encerrada pela instituição" (RN30) e `cancelledBy = ESTABLISHMENT` (DT44), sem devolver estoque,
    porque o alimento é excluído junto (DT27); `deleted = true` em todos os alimentos, no estabelecimento e no usuário.
  - **Entidade (RN29):** pedidos `Pendente` e `Em andamento` → `Cancelado`, com o mesmo motivo e
    `cancelledBy = BENEFICIARY_ENTITY` (DT44); a quantidade dos `Em andamento` volta ao estoque, com a saída de
    `Reservado` (RN09) e o ajuste dos pedidos totais pendentes (DT32); `deleted = true` na entidade, no usuário e nos
    pedidos dela, **exceto** os `Doado` e `Cancelado` de estabelecimentos não excluídos.
  - Nos dois casos, todas as sessões da conta são apagadas. A conta não loga mais (RN32), some do feed, da listagem
    de instituições e do perfil público (RN35), e a outra parte continua vendo os pedidos históricos.
- **Concorrência:** a exclusão trava a instituição e os alimentos afetados, e o cadastro de pedido (entidade) e de
  alimento (estabelecimento) passa a conferir, com trava, que a instituição não foi excluída no meio do caminho.

### Frontend

- Seção **"Zona de perigo"** no fim da tela de perfil, com o botão "Excluir conta".
- Diálogo de confirmação que:
  - busca o impacto e diz quantos pedidos serão rejeitados e cancelados (estabelecimento) ou cancelados (entidade),
    e que os alimentos saem do ar (estabelecimento) ou que as quantidades voltam ao estoque (entidade);
  - avisa que a ação não pode ser desfeita e que o e-mail, o CNPJ e os celulares continuam presos à conta excluída;
  - exige digitar a palavra **EXCLUIR** e a senha da conta (DT45); o botão só habilita com as duas.
- Ao concluir: limpa o estado da sessão, vai para o login e mostra um toast de conta excluída. Senha errada fica no
  diálogo, com a mensagem no campo.

### Documentação

- `docs/REQUISITOS.md`: DT44 e DT45 novas, citadas na observação do RF04 e do RF05; a DT33 passa a citar a DT44.
- `docs/MODELO-DE-DADOS.md`: a nota do `cancelledBy` registra o valor gravado pela 4.4. Sem mudança de schema.
- `docs/PLANO-IMPLEMENTACAO.md`: item 4.4 marcado ✅ ao fim.

**Decisões tomadas com a dupla antes da proposta:**

- **DT44:** na autoexclusão (RF04, RF05), os pedidos cancelados gravam em `cancelledBy` a parte que encerrou a
  conta (`ESTABLISHMENT` ou `BENEFICIARY_ENTITY`), junto do motivo de sistema "Conta encerrada pela instituição". A
  outra parte vê "O estabelecimento cancelou este pedido" (ou "A entidade…") com esse motivo. `SYSTEM` fica para a
  expiração (RF72) e `ADMINISTRATOR` para a exclusão pelo painel (RF42, RF43).
- **DT45:** a exclusão da própria conta exige digitar a palavra "EXCLUIR" e a senha da conta. A palavra é conferida
  só na tela; a senha é conferida no servidor, e a errada responde `400` com `code: INVALID_PASSWORD`, sem excluir
  nada e sem derrubar a sessão.

### Fora desta change

- Exclusão lógica de instituição pelo administrador, com escolha de motivo (RF42, RF43, RF44 com `deleted`): 5.3
  `admin-exclusoes-instituicoes`, que reaproveita a lógica daqui.
- Exclusão permanente de instituição (RF45, RF46): 5.3.
- Reativar conta excluída, liberar CNPJ, e-mails e celulares para um novo cadastro, ou apagar a imagem do MinIO: não
  há RF; a exclusão é só lógica.
- Sugestões pendentes feitas pela instituição (RF71) continuam como estão; o administrador decide sobre elas como
  sobre qualquer outra.
- Esconder o link para o perfil público da outra parte no detalhe do pedido quando ela foi excluída: o perfil já
  responde "Instituição não encontrada" (4.3).

## Capabilities

### New Capabilities

- `estabelecimentos/exclusao-conta`: impacto e exclusão lógica da própria conta do estabelecimento (RF04, RN28, RN30,
  DT44, DT45), com a tela "Zona de perigo" e o diálogo de confirmação.
- `entidades-beneficiarias/exclusao-conta`: impacto e exclusão lógica da própria conta da entidade (RF05, RN29, RN30,
  DT44, DT45), com a tela "Zona de perigo" e o diálogo de confirmação.

### Modified Capabilities

Nenhuma. Login bloqueado de conta excluída (`auth/login`), listagens e perfis sem instituição excluída
(`instituicoes/*`, `alimentos/listagem`), detalhe do pedido acessível às partes depois da exclusão (`pedidos/detalhe`)
e a exibição de quem cancelou (`pedidos/listagem`, `pedidos/detalhe`) já cobrem o comportamento que a exclusão
precisa. As specs novas citam esses efeitos nos cenários.

## Impact

- **Backend:** `establishments` e `beneficiary-entities` (controller, service, DTO de senha e de impacto); um módulo
  ou helper compartilhado para os efeitos sobre pedidos e a revogação de sessões, para a 5.3 reaproveitar;
  `orders.service` (`create` confere a entidade com trava) e `foods.service` (`create` confere o estabelecimento com
  trava); `auth.api.verifyPassword` do better-auth chamado pelo servidor (a rota HTTP `/verify-password` continua
  desligada).
- **Frontend:** `features/profile` (seção "Zona de perigo", diálogo, chamadas novas em `profile-api.ts`) e
  `AuthProvider` (encerrar o estado da sessão sem chamar o logout do servidor, que já não tem sessão).
- **Banco:** sem migration. Usa `deleted` de `user`, `establishment`, `beneficiary_entity`, `food` e `order`, o
  `cancelledBy` e o motivo de sistema já semeado.
- **Sem variável de ambiente nova.**
