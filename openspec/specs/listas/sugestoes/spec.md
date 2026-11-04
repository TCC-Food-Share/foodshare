# listas/sugestoes Specification

## Purpose

Permitir que estabelecimentos e entidades beneficiárias sugiram novas opções para as listas padronizadas sem interromper o formulário em andamento (RF71, RN38, RN39).

## Requirements

### Requirement: Envio de sugestão pela instituição

Um estabelecimento ou uma entidade beneficiária autenticados SHALL poder enviar uma sugestão informando o tipo (categoria, item do catálogo de alimentos, unidade de medida ou motivo de cancelamento) e o texto, de até 200 caracteres, sem espaços nas pontas. A sugestão SHALL nascer com status `Pendente` e guardar quem a enviou. Requisição sem sessão SHALL receber `401`, e o administrador SHALL receber `403` com `code` `ROLE_NOT_ALLOWED`.

#### Scenario: Sugestão válida

- **WHEN** um estabelecimento autenticado envia o tipo "item do catálogo" e o texto "Pão de queijo"
- **THEN** o sistema responde `201`, com a sugestão no status `Pendente`, ligada a quem enviou

#### Scenario: Entidade beneficiária sugere

- **WHEN** uma entidade beneficiária autenticada envia o tipo "motivo de cancelamento" e o texto "Veículo indisponível"
- **THEN** o sistema responde `201`, com a sugestão no status `Pendente`

#### Scenario: Tipo inválido ou texto vazio

- **WHEN** a sugestão é enviada com tipo fora dos quatro valores, ou com texto vazio, só com espaços ou acima de 200 caracteres
- **THEN** o sistema responde `400` e não grava nada

#### Scenario: Administrador tenta sugerir

- **WHEN** um administrador autenticado envia uma sugestão
- **THEN** o sistema responde `403` com `code` `ROLE_NOT_ALLOWED`

#### Scenario: Sem sessão

- **WHEN** a sugestão é enviada sem sessão válida
- **THEN** o sistema responde `401` e não grava nada

### Requirement: Sugestão repetida é recusada

O sistema SHALL recusar a sugestão cujo texto, sem diferenciar maiúsculas nem acentos, já exista na lista do tipo escolhido, respondendo `409` com `code` `SUGGESTION_OPTION_EXISTS`. Para unidade de medida, SHALL comparar com o nome e com a sigla. O sistema SHALL recusar também a sugestão igual a outra `Pendente` do mesmo tipo, de qualquer instituição, respondendo `409` com `code` `SUGGESTION_ALREADY_PENDING`. Sugestão igual a outra já `Recusada` ou de outro tipo SHALL ser aceita.

#### Scenario: Opção já existe na lista

- **WHEN** a lista de categorias tem "Laticínios" e chega uma sugestão de categoria com o texto "laticinios"
- **THEN** o sistema responde `409` com `code` `SUGGESTION_OPTION_EXISTS` e não grava nada

#### Scenario: Texto igual à sigla de uma unidade

- **WHEN** a unidade Quilograma tem a sigla "kg" e chega uma sugestão de unidade com o texto "KG"
- **THEN** o sistema responde `409` com `code` `SUGGESTION_OPTION_EXISTS`

#### Scenario: Já sugerida por outra instituição

- **WHEN** há uma sugestão `Pendente` de item do catálogo com o texto "Pão de queijo" e outra instituição envia "pao de queijo" do mesmo tipo
- **THEN** o sistema responde `409` com `code` `SUGGESTION_ALREADY_PENDING` e não grava nada

#### Scenario: Mesma palavra em outro tipo

- **WHEN** há uma sugestão `Pendente` de categoria com o texto "Congelados" e chega uma de item do catálogo com o mesmo texto
- **THEN** o sistema aceita a sugestão

#### Scenario: Reenvio depois de recusada

- **WHEN** uma sugestão foi recusada e uma instituição envia o mesmo texto e tipo
- **THEN** o sistema aceita a sugestão, como `Pendente`

### Requirement: Ação "Sugerir nova opção" nos selects

Os selects com busca dos formulários de instituição ligados a uma lista padronizada SHALL oferecer a ação "Sugerir nova opção", visível também quando a busca não encontra nada. A ação SHALL abrir um diálogo com Tipo e Texto, sobre o formulário. O tipo SHALL vir escolhido conforme o campo de origem, podendo ser trocado entre os quatro tipos. O texto SHALL vir preenchido com o termo que estava na busca, se houver.

#### Scenario: Busca sem resultado

- **WHEN** o estabelecimento busca "tapioca doce" no select de alimento, sem resultado, e escolhe "Sugerir nova opção"
- **THEN** o diálogo abre com o tipo "Item do catálogo" e o texto "tapioca doce"

#### Scenario: Campo de origem define o tipo

- **WHEN** o estabelecimento escolhe "Sugerir nova opção" no select de unidade
- **THEN** o diálogo abre com o tipo "Unidade de medida", e o estabelecimento pode trocá-lo por "Categoria"

#### Scenario: Select fora dos formulários de instituição

- **WHEN** o administrador abre o select de categoria no formulário de item do catálogo do painel
- **THEN** a ação "Sugerir nova opção" não aparece

### Requirement: Sugestão não interrompe o formulário

Enviar, cancelar ou ter recusada uma sugestão SHALL NOT fechar, enviar nem alterar o formulário em andamento. O usuário SHALL poder continuar com a opção existente mais próxima. Ao enviar com sucesso, o diálogo SHALL fechar e a interface SHALL confirmar o envio. Sugestão recusada SHALL mostrar o erro no campo de texto do diálogo, que continua aberto: com mensagem própria para opção existente, para sugestão já pendente e para conteúdo proibido.

#### Scenario: Sugestão no meio do cadastro de alimento

- **WHEN** o estabelecimento já preencheu parte do modal de alimento e envia uma sugestão com sucesso
- **THEN** o diálogo fecha, a interface confirma o envio, e o modal continua aberto com os dados preenchidos, sem cadastrar o alimento

#### Scenario: Cancelar a sugestão

- **WHEN** o estabelecimento abre o diálogo de sugestão e o cancela
- **THEN** o modal de alimento continua aberto, com os dados preenchidos

#### Scenario: Opção já existente

- **WHEN** a sugestão é recusada com `SUGGESTION_OPTION_EXISTS`
- **THEN** o diálogo continua aberto, com uma mensagem no campo de texto dizendo que a opção já existe

#### Scenario: Conteúdo proibido

- **WHEN** a sugestão é recusada com `PROHIBITED_CONTENT`
- **THEN** o diálogo continua aberto, com a mensagem de conteúdo proibido no campo de texto

### Requirement: Opção aprovada aparece no próximo cadastro

Depois de aprovada, a nova opção SHALL aparecer nos selects da lista correspondente, sem notificação a quem sugeriu.

#### Scenario: Item aprovado no select

- **WHEN** o administrador aprova a sugestão "Pão de queijo" como item do catálogo e o estabelecimento abre o modal de alimento depois disso
- **THEN** o select de alimento mostra "Pão de queijo" com a categoria escolhida na aprovação
