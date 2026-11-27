## Why

Desde a 5.2, o administrador só tira uma instituição do ar marcando o campo "deletado" dentro da tela de edição, e não
há como apagar de vez uma conta (RF45, RF46), por exemplo um cadastro de teste ou uma instituição que pediu a remoção
dos dados. É o item 5.3 do plano, que depende da 5.2 (`admin-instituicoes`), já em `develop`, e fecha a gestão de
instituições do painel.

## What Changes

Cobre **RF42, RF43, RF45 e RF46**, com as decisões novas **DT54 a DT56** (abaixo). Usa a RN28, a RN29, a RN30, a
RN31, a RN46, a DT44 e a DT49, que já valem, e a ordem de exclusão de `docs/MODELO-DE-DADOS.md` ("Exclusões
permanentes").

### Backend

- **Exclusão lógica (RF42, RF43):** nenhuma rota nova. A ação "Excluir" usa a mesma operação da 5.2
  (`PATCH /admin/institutions/{tipo}/:id` com `deleted: true` e `cancellationReasonId`), com a consulta de impacto e a
  lista de motivos que já existem (DT49).
- **Exclusão permanente (RF45, RF46):** rota nova `DELETE /admin/institutions/{tipo}/:id`, resposta `204`. Só aceita
  instituição já excluída logicamente (DT54); a ativa responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED`, sem
  apagar nada. Numa única transação, na ordem do `MODELO-DE-DADOS.md`:
  - **estabelecimento:** pedidos dos seus alimentos e os demais pedidos dele → alimentos → sugestões feitas pela conta
    → estabelecimento → endereço → códigos de verificação → usuário (sessões e contas em cascata);
  - **entidade:** pedidos → sugestões feitas pela conta → entidade → endereço → códigos de verificação → usuário.
  - As sugestões entram na ordem porque `Suggestion.requesterId` não tem cascade (1.1). O `MODELO-DE-DADOS.md` é
    atualizado para incluí-las.
  - Depois do commit, apaga do MinIO a imagem do responsável e, no estabelecimento, as imagens dos alimentos.
- **Auditoria (RN46, DT56):** `establishment.delete` e `beneficiary_entity.delete`, na mesma transação, com razão
  social, CNPJ e quantos alimentos, pedidos e sugestões foram apagados. Nenhum dado pessoal do responsável.

### Frontend

- **Ação "Excluir" (RF42, RF43):** na linha da listagem e no perfil completo de uma instituição ativa, um diálogo com
  o impacto (quantos pedidos serão rejeitados ou cancelados, conforme o tipo) e o select de motivo obrigatório,
  reaproveitando o que o bloco "Situação da conta" da edição já mostra. A edição continua oferecendo a mesma exclusão.
- **Ação "Excluir permanentemente" (RF45, RF46):** na linha e no perfil de uma instituição excluída logicamente, um
  diálogo com o alerta de irreversível, o que será apagado (alimentos e pedidos, pelas contagens do perfil) e o campo
  onde o administrador digita "EXCLUIR" para liberar o botão (DT55). Ao concluir, mensagem de sucesso e volta para a
  listagem.

### Documentação

- `docs/REQUISITOS.md`: DT54 a DT56 novas, citadas nas observações do RF42, RF43, RF45 e RF46.
- `docs/MODELO-DE-DADOS.md`: as sugestões da conta entram na ordem das exclusões permanentes de estabelecimento e de
  entidade, junto dos códigos de verificação.
- `docs/PLANO-IMPLEMENTACAO.md`: item 5.3 marcado ✅ ao fim.

**Decisões tomadas com a dupla antes da proposta:**

- **DT54:** a exclusão permanente (RF45, RF46) só vale para instituição já excluída logicamente. O fluxo tem dois
  passos: excluir (RN28/RN29, com motivo) e, depois, excluir permanentemente. Assim, quando os pedidos são apagados,
  nenhum está em aberto: sem isso, apagar uma entidade com pedido `Em andamento` deixaria o alimento do outro lado
  `Reservado` com estoque 0 para sempre, porque o pedido apagado não devolve quantidade (`MODELO-DE-DADOS.md`).
  Instituição ativa responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED`.
- **DT55:** a exclusão permanente exige digitar a palavra "EXCLUIR" no diálogo, como na DT45. A palavra é conferida só
  na tela; não há senha.
- **DT56:** a auditoria da exclusão permanente guarda razão social, CNPJ e as contagens de alimentos, pedidos e
  sugestões apagados. Não guarda nome, e-mail nem celular do responsável, que saem do sistema com a conta.

### Fora desta change

- Exclusão permanente de alimentos (RF51) e de pedidos (RF54) avulsos: 5.4 e 5.5.
- Lembretes de WhatsApp (`OrderReminder`): a tabela só nasce na 6.2 e sai em cascata com o pedido, então a ordem de
  exclusão não muda por causa dela.
- Avisar a instituição por e-mail sobre a exclusão: fora do escopo (RN45).
- Exclusão permanente direta de instituição ativa, num passo só: recusada pela DT54.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `admin/instituicoes`: requisito novo de exclusão permanente (RF45, RF46, DT54, DT56); a auditoria passa a incluir
  `*.delete`; as telas de listagem e de perfil completo ganham as ações "Excluir" (RF42, RF43) e "Excluir
  permanentemente" (DT55).

## Impact

- **Backend:** `admin/institutions` ganha a rota `DELETE` e um método de exclusão permanente no service, com as travas
  da 4.4 (`institution-locks.ts`) e a remoção das imagens depois do commit pelo `ImageStorageService`. Erro novo
  `INSTITUTION_NOT_SOFT_DELETED` em `institution.errors.ts`.
- **Frontend:** `features/admin/institutions/` ganha os diálogos de exclusão lógica e de exclusão permanente, usados
  na listagem e no perfil; o trecho de impacto e motivo da edição passa a ser compartilhado. `institutionsApi` ganha
  `remove`.
- **Banco:** sem migration.
- **Sem variável de ambiente nova.**
