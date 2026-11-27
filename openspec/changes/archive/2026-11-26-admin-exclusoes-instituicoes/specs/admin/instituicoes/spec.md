## ADDED Requirements

### Requirement: Exclusão permanente de instituição

O sistema SHALL permitir que o administrador exclua permanentemente um estabelecimento ou uma entidade beneficiária,
escolhendo o tipo pela rota, removendo de vez todos os dados ligados à conta (RF45, RF46). A exclusão permanente SHALL
valer só para instituição já excluída logicamente (DT54); instituição com `deleted = false` SHALL ser recusada com
`409` e `code: INSTITUTION_NOT_SOFT_DELETED`, sem apagar nada. Identificador que não é de uma instituição do tipo da
rota SHALL responder `404`.

Numa única operação atômica, o sistema SHALL apagar:

- estabelecimento (RF45): todos os pedidos dos seus alimentos e todos os pedidos em que ele é o estabelecimento, de
  qualquer status e excluídos logicamente ou não; todos os seus alimentos; as sugestões feitas pela conta, de qualquer
  status; o estabelecimento; o endereço; os códigos de confirmação e de recuperação de senha do e-mail pessoal; as
  sessões; e o usuário;
- entidade (RF46): todos os pedidos da entidade, de qualquer status e excluídos logicamente ou não; as sugestões feitas
  pela conta, de qualquer status; a entidade; o endereço; os códigos de confirmação e de recuperação de senha do e-mail
  pessoal; as sessões; e o usuário.

A exclusão permanente SHALL NOT alterar estoque nem status de nenhum alimento de outro estabelecimento. Depois que a
exclusão for gravada, o sistema SHALL apagar do armazenamento a imagem do responsável e, no estabelecimento, as imagens
dos alimentos; falha ao apagar uma imagem SHALL NOT desfazer a exclusão. Se a exclusão falhar, nada SHALL ser apagado,
nem do banco nem do armazenamento. Depois da exclusão, CNPJ, e-mails e celulares da conta SHALL ficar livres para um
novo cadastro. A resposta SHALL ser `204`.

A exclusão permanente SHALL ser segura sob concorrência: uma restauração (DT50) ao mesmo tempo SHALL terminar ou com a
instituição restaurada e a exclusão recusada com `409`, ou com a instituição apagada e a restauração respondendo `404`;
duas exclusões permanentes ao mesmo tempo SHALL terminar com uma `204` e a outra `404`.

#### Scenario: Estabelecimento excluído permanentemente

- **WHEN** o administrador exclui permanentemente um estabelecimento excluído logicamente, com 3 alimentos excluídos e
  4 pedidos `Rejeitado`, `Doado` e `Cancelado`
- **THEN** o sistema responde `204`, e o estabelecimento, o usuário, o endereço, os 3 alimentos e os 4 pedidos deixam
  de existir

#### Scenario: Entidade excluída permanentemente

- **WHEN** o administrador exclui permanentemente uma entidade excluída logicamente, com 2 pedidos `Doado` de um
  estabelecimento ativo
- **THEN** o sistema responde `204`, a entidade, o usuário, o endereço e os 2 pedidos deixam de existir, e o
  estabelecimento deixa de ver esses pedidos

#### Scenario: Alimento do outro lado não muda

- **WHEN** o administrador exclui permanentemente uma entidade cujo pedido `Cancelado` era de um alimento `Ativo` com
  estoque 5
- **THEN** o alimento continua `Ativo` com estoque 5

#### Scenario: Instituição ativa

- **WHEN** o administrador tenta excluir permanentemente um estabelecimento com `deleted = false`
- **THEN** o sistema responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED` e não apaga nada

#### Scenario: Tipo errado na rota

- **WHEN** o administrador chama a exclusão permanente de entidade com o id de um estabelecimento que não existe como
  entidade
- **THEN** o sistema responde `404` e não apaga nada

#### Scenario: Sugestões da conta apagadas

- **WHEN** o administrador exclui permanentemente uma entidade que fez uma sugestão `Pendente` e uma `Aprovada`
- **THEN** as duas sugestões deixam de existir, e a opção criada pela aprovação continua na lista

#### Scenario: Imagens apagadas depois da exclusão

- **WHEN** o administrador exclui permanentemente um estabelecimento com 2 alimentos
- **THEN** a imagem do responsável e as 2 imagens dos alimentos deixam de existir no armazenamento

#### Scenario: Falha no meio da exclusão

- **WHEN** a gravação da auditoria falha durante a exclusão permanente
- **THEN** nenhum registro é apagado e nenhuma imagem é removida do armazenamento

#### Scenario: Dados liberados para novo cadastro

- **WHEN** uma entidade é excluída permanentemente e, depois, alguém se cadastra com o mesmo CNPJ e o mesmo e-mail
  pessoal
- **THEN** o cadastro é aceito

#### Scenario: Conta apagada não loga

- **WHEN** o responsável de uma instituição excluída permanentemente tenta logar
- **THEN** o login é recusado como credencial inválida

#### Scenario: Restauração ao mesmo tempo

- **WHEN** o administrador restaura uma instituição enquanto outro administrador a exclui permanentemente
- **THEN** ou a instituição fica restaurada e a exclusão responde `409`, ou a instituição fica apagada e a restauração
  responde `404`

### Requirement: Ação de exclusão lógica na listagem e no perfil

A tela de gestão de instituições e a tela de perfil completo SHALL oferecer, para instituição com `deleted = false`, a
ação "Excluir" (RF42, RF43), que abre um diálogo com a mesma exclusão lógica da edição (DT49). O diálogo SHALL mostrar,
antes de confirmar, o impacto: para estabelecimento, quantos pedidos pendentes serão rejeitados e quantos em andamento
serão cancelados; para entidade, quantos pedidos pendentes e em andamento serão cancelados. O diálogo SHALL exigir a
escolha de um motivo da lista de motivos do administrador (sem os de sistema) antes de liberar a confirmação. Ao
concluir, a tela SHALL mostrar a mensagem de sucesso e passar a mostrar a instituição como excluída. Se a instituição
já tiver sido excluída por outro caminho, a tela SHALL mostrá-la como excluída, sem erro.

#### Scenario: Excluir pela listagem

- **WHEN** o administrador clica em "Excluir" na linha de um estabelecimento ativo com 2 pedidos pendentes e 1 em
  andamento
- **THEN** o diálogo mostra que 2 pedidos serão rejeitados e 1 cancelado, e o botão de confirmar só fica habilitado
  depois de escolhido o motivo

#### Scenario: Exclusão concluída

- **WHEN** o administrador escolhe o motivo e confirma a exclusão de uma entidade pelo perfil completo
- **THEN** a tela mostra a mensagem de sucesso e o perfil passa a mostrar a entidade como excluída

#### Scenario: Instituição excluída não tem a ação

- **WHEN** o administrador vê a linha de uma instituição excluída logicamente
- **THEN** a linha não oferece "Excluir"

### Requirement: Diálogo de exclusão permanente

A tela de gestão de instituições e a tela de perfil completo SHALL oferecer, só para instituição com `deleted = true`,
a ação "Excluir permanentemente" (RF45, RF46, DT54). A ação abre um diálogo que SHALL mostrar o nome da instituição, um
alerta de que a operação é irreversível e quanto será apagado: para estabelecimento, a quantidade de alimentos e de
pedidos; para entidade, a quantidade de pedidos. O botão de confirmar SHALL ficar desabilitado até o administrador
digitar "EXCLUIR" no campo de confirmação (DT55). Ao concluir, a tela SHALL mostrar a mensagem de sucesso e voltar para
a listagem de instituições. Se o servidor recusar porque a instituição foi restaurada no meio, o diálogo SHALL mostrar
a mensagem do erro e não fechar.

#### Scenario: Confirmação digitada

- **WHEN** o administrador abre "Excluir permanentemente" num estabelecimento excluído e digita "excluir" em minúsculas
- **THEN** o botão de confirmar continua desabilitado até o texto ser "EXCLUIR"

#### Scenario: Contagens no diálogo

- **WHEN** o administrador abre "Excluir permanentemente" num estabelecimento excluído com 3 alimentos e 5 pedidos
- **THEN** o diálogo avisa que a ação não pode ser desfeita e que 3 alimentos e 5 pedidos serão apagados

#### Scenario: Exclusão permanente concluída pelo perfil

- **WHEN** o administrador digita "EXCLUIR" e confirma no perfil completo de uma entidade excluída
- **THEN** a tela mostra a mensagem de sucesso, volta para a listagem e a entidade não aparece mais nela

#### Scenario: Instituição ativa não tem a ação

- **WHEN** o administrador vê a linha ou o perfil de uma instituição com `deleted = false`
- **THEN** a ação "Excluir permanentemente" não aparece

#### Scenario: Instituição restaurada no meio

- **WHEN** o servidor responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED` à confirmação
- **THEN** o diálogo mostra que a instituição não está mais excluída e continua aberto

## MODIFIED Requirements

### Requirement: Auditoria das escritas em instituições

Cada cadastro, edição, exclusão lógica, restauração e exclusão permanente feita pelo administrador SHALL gravar uma
linha de auditoria na mesma transação, com o administrador, a ação, o tipo e o id da instituição e a data/hora (RN46).
A edição SHALL registrar só os campos que mudaram, com o valor anterior e o novo. A exclusão lógica SHALL registrar o
motivo e quantos pedidos foram rejeitados e cancelados. A exclusão permanente SHALL registrar a razão social, o CNPJ e
quantos alimentos, pedidos e sugestões foram apagados, e SHALL NOT registrar nome, e-mail nem celular do responsável
(DT56). A auditoria SHALL NOT conter a senha. Escrita recusada SHALL NOT gerar auditoria. A linha da exclusão
permanente SHALL continuar existindo depois que a instituição deixa de existir.

#### Scenario: Cadastro auditado sem senha

- **WHEN** o administrador cadastra um estabelecimento
- **THEN** uma linha `establishment.create` é gravada com o id do estabelecimento, sem a senha

#### Scenario: Edição auditada

- **WHEN** o administrador troca só a descrição de uma entidade
- **THEN** uma linha `beneficiary_entity.update` registra a descrição anterior e a nova, e nenhum outro campo

#### Scenario: Exclusão e restauração auditadas

- **WHEN** o administrador exclui logicamente um estabelecimento e depois o restaura
- **THEN** ficam gravadas uma linha `establishment.soft_delete`, com o motivo e as contagens, e uma linha
  `establishment.restore`

#### Scenario: Exclusão permanente auditada sem dado pessoal

- **WHEN** o administrador exclui permanentemente uma entidade excluída logicamente com 4 pedidos e 1 sugestão
- **THEN** uma linha `beneficiary_entity.delete` é gravada com o id da entidade, a razão social, o CNPJ, 4 pedidos e
  1 sugestão apagados, sem o nome, o e-mail nem o celular do responsável

#### Scenario: Exclusão permanente recusada não é auditada

- **WHEN** o administrador tenta excluir permanentemente uma instituição ativa
- **THEN** nenhuma linha `*.delete` é gravada

### Requirement: Tela de gestão de instituições

A seção "Instituições" do painel SHALL mostrar a tabela administrativa com busca, ordenação, itens por página, o filtro
de tipo e o filtro de situação, e as colunas: tipo, imagem, nome (nome fantasia ou, sem ele, razão social), CNPJ,
responsável (nome, e-mail pessoal e celular pessoal), cidade/UF, data de cadastro e situação. A situação SHALL mostrar
o selo "Excluída" para `deleted = true` e "Aguardando confirmação" para quem não confirmou o e-mail (DT53). Cada linha
SHALL ter as ações "Ver perfil" e "Editar" e, conforme a situação, "Excluir" (instituição ativa, RF42, RF43) ou
"Excluir permanentemente" (instituição excluída, RF45, RF46, DT54). A seção SHALL ter o botão "Nova instituição". O
estado da busca, dos filtros e da página SHALL ficar no endereço da tela, e SHALL ser mantido depois de uma exclusão.

#### Scenario: Seção mostra a tabela

- **WHEN** o administrador abre a seção "Instituições"
- **THEN** a tela mostra a tabela com estabelecimentos e entidades e os dados do responsável em cada linha

#### Scenario: Selos de situação

- **WHEN** a listagem tem uma entidade excluída e um estabelecimento que não confirmou o e-mail
- **THEN** a linha da entidade mostra "Excluída" e a do estabelecimento mostra "Aguardando confirmação"

#### Scenario: Filtro mantido ao recarregar

- **WHEN** o administrador filtra por estabelecimentos excluídos e recarrega a página
- **THEN** a tabela continua com os dois filtros aplicados

#### Scenario: Ações conforme a situação

- **WHEN** a listagem tem um estabelecimento ativo e uma entidade excluída
- **THEN** a linha do estabelecimento oferece "Excluir" e não "Excluir permanentemente", e a da entidade oferece
  "Excluir permanentemente" e não "Excluir"

#### Scenario: Filtro mantido depois da exclusão

- **WHEN** o administrador filtra por excluídas e exclui permanentemente uma instituição pela linha
- **THEN** a tabela continua filtrada por excluídas, sem a instituição apagada

### Requirement: Tela de perfil completo da instituição

A tela de perfil completo SHALL mostrar, somente leitura, em blocos separados: dados institucionais (com a imagem),
dados do responsável, endereço, situação (data de cadastro, excluída ou ativa, e-mail confirmado ou não), os
indicadores de atividade e as tabelas paginadas de alimentos (só estabelecimento) e de pedidos, com o status de cada
um. A tela SHALL ter a ação "Editar" e, conforme a situação, "Excluir" (instituição ativa, RF42, RF43) ou "Excluir
permanentemente" (instituição excluída, RF45, RF46, DT54). Os nomes de status SHALL ser os de `docs/REQUISITOS.md`.
Perfil de instituição que deixou de existir SHALL mostrar que a instituição não foi encontrada, com o caminho de volta
para a listagem.

#### Scenario: Perfil do estabelecimento

- **WHEN** o administrador abre o perfil de um estabelecimento
- **THEN** a tela mostra os blocos, os indicadores de alimentos e de pedidos recebidos e as duas tabelas

#### Scenario: Perfil da entidade

- **WHEN** o administrador abre o perfil de uma entidade
- **THEN** a tela mostra os indicadores de pedidos feitos e a tabela de pedidos, sem bloco de alimentos

#### Scenario: Ações do perfil conforme a situação

- **WHEN** o administrador abre o perfil de uma entidade excluída logicamente
- **THEN** a tela oferece "Editar" e "Excluir permanentemente", e não oferece "Excluir"

#### Scenario: Perfil de instituição apagada

- **WHEN** o administrador abre o endereço do perfil de uma instituição excluída permanentemente
- **THEN** a tela mostra que a instituição não foi encontrada e oferece voltar para a listagem
