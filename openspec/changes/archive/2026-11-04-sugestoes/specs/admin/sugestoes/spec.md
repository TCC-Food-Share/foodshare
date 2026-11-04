## Purpose

Permitir que o administrador veja as sugestões recebidas e decida sobre cada uma, cadastrando a nova opção ao aprovar e registrando a recusa, com auditoria (RF49, RNF14, RN39, RN46).

## ADDED Requirements

### Requirement: Acesso exclusivo do administrador

As operações de listar, aprovar e recusar sugestões SHALL ser restritas ao administrador. Sem sessão SHALL responder `401`, e instituição SHALL receber `403` com `code` `ROLE_NOT_ALLOWED`.

#### Scenario: Instituição tenta listar

- **WHEN** um estabelecimento autenticado lista as sugestões do painel
- **THEN** o sistema responde `403` com `code` `ROLE_NOT_ALLOWED`

#### Scenario: Sem sessão

- **WHEN** a aprovação de uma sugestão é chamada sem sessão válida
- **THEN** o sistema responde `401` e não altera nada

### Requirement: Listagem de sugestões com filtros

O administrador SHALL poder listar as sugestões com paginação, filtro opcional por tipo e por status (`Pendente`, `Aprovada`, `Recusada`), busca e ordenação por campo, conforme o padrão das listagens do painel. A busca SHALL casar o identificador exato, quando o termo for numérico, e o trecho do texto ou do nome da instituição, sem diferenciar maiúsculas nem acentos. Cada linha SHALL trazer identificador, tipo, texto, status, data de envio e o nome da instituição que sugeriu (nome fantasia ou, na falta dele, razão social). Campo de ordenação, tipo ou status fora dos permitidos SHALL responder `400`.

#### Scenario: Filtro por tipo e status

- **WHEN** o administrador lista as sugestões com tipo "unidade de medida" e status `Pendente`
- **THEN** o sistema devolve só as sugestões pendentes de unidade de medida

#### Scenario: Instituição sem nome fantasia

- **WHEN** a instituição que sugeriu não tem nome fantasia
- **THEN** a linha da sugestão traz a razão social

#### Scenario: Filtro inválido

- **WHEN** o administrador lista as sugestões com um status fora dos três valores
- **THEN** o sistema responde `400`

### Requirement: Aprovação cadastra a opção na lista

O administrador SHALL poder aprovar uma sugestão `Pendente`, podendo ajustar o texto. A aprovação SHALL, numa única transação, cadastrar a opção na lista do tipo da sugestão, com o administrador como criador, e marcar a sugestão como `Aprovada`, com o administrador e o momento da decisão. As regras de cadastro da lista SHALL valer: tamanho, nome único sem diferenciar maiúsculas nem acentos e sigla única. Item do catálogo SHALL exigir uma categoria existente. Unidade de medida SHALL exigir sigla e a indicação de fração. Se o cadastro da opção falhar, a sugestão SHALL continuar `Pendente` e nada SHALL ser gravado.

#### Scenario: Aprovar categoria com texto ajustado

- **WHEN** o administrador aprova a sugestão de categoria "congelados" ajustando o texto para "Congelados"
- **THEN** a lista de categorias passa a ter "Congelados", criada por esse administrador, e a sugestão fica `Aprovada`, com o texto original preservado

#### Scenario: Aprovar item do catálogo

- **WHEN** o administrador aprova uma sugestão de item do catálogo escolhendo a categoria "Pães e Massas"
- **THEN** o catálogo passa a ter o item nessa categoria, e a sugestão fica `Aprovada`

#### Scenario: Item do catálogo sem categoria

- **WHEN** o administrador aprova uma sugestão de item do catálogo sem categoria, ou com uma categoria inexistente
- **THEN** o sistema responde `400`, e a sugestão continua `Pendente`

#### Scenario: Aprovar unidade de medida

- **WHEN** o administrador aprova a sugestão de unidade "Bandeja" informando a sigla "bdj" e que não aceita fração
- **THEN** a lista de unidades passa a ter "Bandeja (bdj)", sem fração, e a sugestão fica `Aprovada`

#### Scenario: Unidade sem sigla

- **WHEN** o administrador aprova uma sugestão de unidade sem sigla ou sem a indicação de fração
- **THEN** o sistema responde `400`, e a sugestão continua `Pendente`

#### Scenario: Aprovar motivo de cancelamento

- **WHEN** o administrador aprova uma sugestão de motivo de cancelamento
- **THEN** a opção é criada como motivo comum, disponível para seleção pelas instituições, e a sugestão fica `Aprovada`

#### Scenario: Nome já cadastrado na aprovação

- **WHEN** o administrador aprova uma sugestão com um texto que já existe na lista, sem diferenciar maiúsculas nem acentos
- **THEN** o sistema responde `409` com `code` `DUPLICATE_NAME`, nada é criado, e a sugestão continua `Pendente`

#### Scenario: Sigla já cadastrada na aprovação

- **WHEN** o administrador aprova uma sugestão de unidade com uma sigla já usada
- **THEN** o sistema responde `409` com `code` `DUPLICATE_ABBREVIATION`, e a sugestão continua `Pendente`

#### Scenario: Texto maior que o limite da lista

- **WHEN** o administrador aprova uma sugestão de unidade de medida com mais de 50 caracteres no texto
- **THEN** o sistema responde `400`, e a sugestão continua `Pendente`

### Requirement: Recusa registra a decisão

O administrador SHALL poder recusar uma sugestão `Pendente`, sem motivo. A recusa SHALL marcar a sugestão como `Recusada`, com o administrador e o momento da decisão, sem criar nenhuma opção.

#### Scenario: Recusar sugestão

- **WHEN** o administrador recusa uma sugestão `Pendente`
- **THEN** a sugestão fica `Recusada`, e nenhuma lista muda

### Requirement: Decisão só sobre sugestão pendente

Aprovar ou recusar uma sugestão que não está `Pendente` SHALL responder `409` com `code` `SUGGESTION_ALREADY_REVIEWED`, sem alterar nada, inclusive quando dois administradores decidem ao mesmo tempo. Sugestão inexistente SHALL responder `404`.

#### Scenario: Sugestão já decidida

- **WHEN** o administrador tenta recusar uma sugestão já `Aprovada`
- **THEN** o sistema responde `409` com `code` `SUGGESTION_ALREADY_REVIEWED`, e nada muda

#### Scenario: Duas aprovações ao mesmo tempo

- **WHEN** dois administradores aprovam a mesma sugestão ao mesmo tempo
- **THEN** só uma aprovação cria a opção, e a outra responde `409` com `code` `SUGGESTION_ALREADY_REVIEWED`

#### Scenario: Sugestão inexistente

- **WHEN** o administrador aprova uma sugestão que não existe
- **THEN** o sistema responde `404`

### Requirement: Auditoria das decisões

Aprovar e recusar SHALL gravar uma linha de auditoria (`suggestion.approve` ou `suggestion.reject`) na mesma transação, com o administrador, a sugestão e os dados da decisão. A opção criada pela aprovação SHALL gravar também a linha de auditoria de cadastro da lista correspondente. Operação recusada SHALL NOT gravar auditoria.

#### Scenario: Aprovação auditada

- **WHEN** o administrador aprova uma sugestão de categoria
- **THEN** `audit_log` ganha uma linha `suggestion.approve` e uma `category.create`

#### Scenario: Recusa auditada

- **WHEN** o administrador recusa uma sugestão
- **THEN** `audit_log` ganha uma linha `suggestion.reject`

#### Scenario: Aprovação que falha

- **WHEN** a aprovação responde `409` por nome duplicado
- **THEN** nenhuma linha de auditoria é gravada

### Requirement: Tela de sugestões no painel

A seção "Sugestões" SHALL mostrar a tabela com filtros de tipo e de status, abrindo com o status `Pendente` selecionado e com a opção de ver todos. Só as linhas `Pendente` SHALL ter as ações de aprovar e recusar. Aprovar SHALL abrir um diálogo com o texto editável e, conforme o tipo, a categoria ou a sigla e a fração. Recusar SHALL pedir confirmação. Erros da aprovação SHALL aparecer no campo correspondente do diálogo, que continua aberto. O status SHALL usar os rótulos `Pendente`, `Aprovada` e `Recusada`, e o tipo os rótulos "Categoria", "Item do catálogo", "Unidade de medida" e "Motivo de cancelamento".

#### Scenario: Abertura da seção

- **WHEN** o administrador abre a seção "Sugestões"
- **THEN** a tabela mostra as sugestões pendentes, com tipo, texto, instituição e data

#### Scenario: Linha já decidida

- **WHEN** o administrador filtra pelo status `Aprovada`
- **THEN** as linhas aparecem sem as ações de aprovar e recusar

#### Scenario: Diálogo conforme o tipo

- **WHEN** o administrador abre a aprovação de uma sugestão de unidade de medida
- **THEN** o diálogo pede texto, sigla e fração, sem pedir categoria

#### Scenario: Nome duplicado na tela

- **WHEN** a aprovação responde `DUPLICATE_NAME`
- **THEN** o diálogo continua aberto, com o erro no campo de texto
