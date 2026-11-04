## ADDED Requirements

### Requirement: Acesso exclusivo do administrador

As rotas de gestão das listas padronizadas SHALL ficar sob `/admin/` e SHALL ser acessíveis só por administradores. Requisição sem sessão SHALL receber `401`; estabelecimento ou entidade beneficiária SHALL receber `403` com `code` `ROLE_NOT_ALLOWED`.

#### Scenario: Instituição tenta gerenciar uma lista

- **WHEN** um estabelecimento autenticado tenta cadastrar uma categoria
- **THEN** o sistema responde `403` com `code` `ROLE_NOT_ALLOWED` e não cria nada

#### Scenario: Requisição sem sessão

- **WHEN** a listagem de unidades de medida do painel é pedida sem sessão
- **THEN** o sistema responde `401`

### Requirement: Listagem administrativa com busca, ordenação e paginação

Cada lista SHALL ter uma listagem administrativa paginada (`page` e `pageSize`, que aceita 10, 20, 50 ou 100, com padrão 10; resposta `{ data, total, page, pageSize }`), com busca opcional e ordenação por campo (`sort` e `order` `asc` ou `desc`). A busca SHALL casar o identificador exato quando o termo for numérico e, em todos os casos, o trecho nos campos de texto da lista, sem diferenciar maiúsculas nem acentos: nome (categorias e motivos), nome e categoria (catálogo), nome e sigla (unidades) e termo (termos proibidos). Cada linha SHALL trazer quantas vezes a opção está em uso. Sem `sort`, a ordem SHALL ser por identificador crescente. Campo de ordenação fora dos permitidos SHALL ser rejeitado com `400`.

#### Scenario: Busca sem acento no catálogo pela categoria

- **WHEN** o administrador busca "laticinios" no catálogo
- **THEN** a listagem traz os itens da categoria "Laticínios"

#### Scenario: Busca pelo identificador

- **WHEN** o administrador busca "3" nas categorias
- **THEN** a listagem traz a categoria de identificador 3 e as categorias cujo nome contém "3"

#### Scenario: Ordenação por nome decrescente

- **WHEN** o administrador lista as unidades com `sort=name` e `order=desc`
- **THEN** as unidades vêm em ordem alfabética decrescente

#### Scenario: Itens por página

- **WHEN** o administrador lista o catálogo sem `pageSize` e depois com `pageSize=50`
- **THEN** a primeira resposta traz até 10 itens e a segunda até 50, e `pageSize=30` é rejeitado com `400`

#### Scenario: Campo de ordenação inválido

- **WHEN** o administrador lista as categorias com `sort=senha`
- **THEN** o sistema responde `400`

#### Scenario: Uso da opção na linha

- **WHEN** o administrador lista as categorias
- **THEN** cada categoria traz a quantidade de itens do catálogo ligados a ela

### Requirement: Cadastro e edição com nome único

O administrador SHALL poder cadastrar e editar opções de cada lista: categoria (nome), item do catálogo (nome e categoria), unidade de medida (nome, sigla e se aceita fração), motivo de cancelamento (nome) e termo proibido (termo). O nome SHALL ser único na lista sem diferenciar maiúsculas nem acentos, e a sigla da unidade também; repetição SHALL responder `409` com `code` `DUPLICATE_NAME` ou `DUPLICATE_ABBREVIATION`, sem alterar nada. Na edição, manter o próprio nome SHALL ser permitido. O cadastro SHALL guardar o administrador que o fez. O termo proibido SHALL ser gravado em minúsculas e sem acentos.

#### Scenario: Cadastro de categoria

- **WHEN** o administrador cadastra a categoria "Congelados"
- **THEN** a categoria é criada, ligada ao administrador que a cadastrou

#### Scenario: Nome repetido com acento diferente

- **WHEN** o administrador cadastra o item do catálogo "PAO FRANCES" e já existe "Pão francês"
- **THEN** o sistema responde `409` com `code` `DUPLICATE_NAME` e não cria o item

#### Scenario: Sigla repetida

- **WHEN** o administrador edita a unidade "Grama" para a sigla "KG", que já é de "Quilograma"
- **THEN** o sistema responde `409` com `code` `DUPLICATE_ABBREVIATION` e a unidade não muda

#### Scenario: Edição mantendo o próprio nome

- **WHEN** o administrador edita só a categoria do item "Café", mantendo o nome
- **THEN** o item é atualizado

#### Scenario: Item do catálogo com categoria inexistente

- **WHEN** o administrador cadastra um item do catálogo com uma categoria que não existe
- **THEN** o sistema responde `400` e não cria o item

#### Scenario: Termo proibido normalizado

- **WHEN** o administrador cadastra o termo "Otário"
- **THEN** o termo é gravado como "otario", e cadastrar "OTARIO" em seguida responde `409` com `code` `DUPLICATE_NAME`

### Requirement: Exclusão bloqueada para opção em uso

O administrador SHALL poder excluir uma opção só quando ela não estiver em uso: categoria sem itens do catálogo; item do catálogo e unidade de medida sem alimentos, inclusive os excluídos logicamente; motivo de cancelamento sem pedidos. Opção em uso SHALL responder `409` com `code` `OPTION_IN_USE`, sem excluir. Termo proibido SHALL poder ser excluído sempre.

#### Scenario: Categoria com itens do catálogo

- **WHEN** o administrador tenta excluir a categoria "Laticínios", que tem itens no catálogo
- **THEN** o sistema responde `409` com `code` `OPTION_IN_USE` e a categoria continua existindo

#### Scenario: Unidade sem alimentos

- **WHEN** o administrador exclui uma unidade que nenhum alimento usa
- **THEN** a unidade deixa de existir

#### Scenario: Exclusão de termo proibido

- **WHEN** o administrador exclui um termo proibido
- **THEN** o termo deixa de existir

### Requirement: Motivos de sistema protegidos

Os três motivos de sistema SHALL aparecer na listagem administrativa marcados como de sistema, e SHALL NOT poder ser editados nem excluídos: a tentativa SHALL responder `409` com `code` `SYSTEM_REASON_PROTECTED`. Motivos cadastrados pelo administrador SHALL ser sempre comuns.

#### Scenario: Edição de motivo de sistema

- **WHEN** o administrador tenta renomear o motivo "Alimento vencido"
- **THEN** o sistema responde `409` com `code` `SYSTEM_REASON_PROTECTED` e o motivo não muda

#### Scenario: Motivo novo é comum

- **WHEN** o administrador cadastra o motivo "Estabelecimento fechado"
- **THEN** o motivo é criado como comum e passa a aparecer para seleção das instituições

### Requirement: Fração da unidade em uso

O administrador SHALL NOT poder desmarcar "aceita fração" de uma unidade enquanto houver alimento não excluído com quantidade fracionada nela: a tentativa SHALL responder `409` com `code` `FRACTION_IN_USE`, sem alterar a unidade.

#### Scenario: Unidade com alimento fracionado

- **WHEN** existe um alimento ativo com 2,5 kg e o administrador desmarca "aceita fração" em "Quilograma"
- **THEN** o sistema responde `409` com `code` `FRACTION_IN_USE` e a unidade continua aceitando fração

#### Scenario: Unidade sem alimento fracionado

- **WHEN** todos os alimentos em "Litro" têm quantidade inteira e o administrador desmarca "aceita fração"
- **THEN** a unidade passa a não aceitar fração

### Requirement: Auditoria das escritas

Todo cadastro, edição e exclusão nas listas SHALL gravar uma linha de auditoria na mesma transação da escrita, com o administrador, a ação (`<recurso>.create`, `<recurso>.update` ou `<recurso>.delete`), o tipo e o identificador do registro e os dados relevantes (o registro criado, os valores antes e depois, ou o registro excluído). Se a auditoria falhar, a escrita SHALL ser desfeita.

#### Scenario: Edição auditada

- **WHEN** o administrador renomeia a categoria "Outros" para "Diversos"
- **THEN** existe uma linha de auditoria `category.update` com o identificador da categoria e os nomes antes e depois

#### Scenario: Escrita recusada não audita

- **WHEN** a exclusão de uma categoria em uso é recusada
- **THEN** nenhuma linha de auditoria é gravada

### Requirement: Telas de gestão das listas no painel

Cada seção de lista padronizada SHALL mostrar o título, uma descrição curta, o botão de nova opção e uma tabela administrativa com busca, ordenação por coluna, paginação com escolha de itens por página (10, 20, 50 ou 100, padrão 10) e as ações de editar e excluir por linha. O cadastro e a edição SHALL acontecer num diálogo com os campos da lista; a exclusão SHALL pedir confirmação. Opções em uso SHALL mostrar a ação de excluir desabilitada com a explicação, e os motivos de sistema SHALL aparecer com um selo "Sistema" e sem ações. Os erros do servidor SHALL aparecer no campo certo do diálogo. Depois de cada escrita, a tabela SHALL refletir a mudança sem recarregar a página.

#### Scenario: Cadastro pelo diálogo

- **WHEN** o administrador clica em "Nova categoria", informa "Congelados" e salva
- **THEN** o diálogo fecha e "Congelados" aparece na tabela

#### Scenario: Nome repetido no diálogo

- **WHEN** o administrador salva uma unidade com a sigla de outra
- **THEN** o diálogo continua aberto e mostra o erro no campo da sigla

#### Scenario: Escolha de itens por página

- **WHEN** o administrador escolhe 50 no seletor de itens por página do rodapé
- **THEN** a tabela passa a mostrar até 50 linhas, volta para a primeira página e a escolha fica no endereço da página

#### Scenario: Busca e ordenação na tabela

- **WHEN** o administrador digita "pao" na busca do catálogo e clica no cabeçalho "Nome"
- **THEN** a tabela mostra só os itens com "pão" no nome, ordenados por nome
