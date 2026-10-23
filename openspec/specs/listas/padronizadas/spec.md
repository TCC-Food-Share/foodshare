# listas/padronizadas Specification

## Purpose

Manter no banco as listas padronizadas (categorias, catálogo de alimentos, unidades de medida, motivos de cancelamento e termos proibidos) e a tabela de sugestões, com nome único sem diferenciar maiúsculas nem acentos, o administrador criador, os motivos de sistema e os seeds iniciais (RN31, RN37, RN40).

## Requirements

### Requirement: Listas padronizadas no banco

O sistema SHALL manter cinco listas padronizadas: categorias, catálogo de alimentos, unidades de medida, motivos de cancelamento e termos proibidos. Cada item do catálogo de alimentos SHALL pertencer a exatamente uma categoria. Cada unidade de medida SHALL ter nome, sigla e a indicação de que aceita ou não quantidade fracionada. Cada registro das cinco listas SHALL guardar o administrador que o criou; registros criados pelo seed SHALL ficar sem administrador.

#### Scenario: Item do catálogo sem categoria

- **WHEN** um item do catálogo de alimentos é gravado sem categoria, ou com uma categoria que não existe
- **THEN** o banco recusa a gravação

#### Scenario: Registro do seed sem administrador

- **WHEN** o seed cria as listas num banco vazio
- **THEN** nenhum registro das cinco listas fica ligado a um administrador

### Requirement: Nome único sem diferenciar maiúsculas nem acentos

Em cada lista padronizada, o sistema SHALL recusar no banco um nome que já exista na mesma lista, sem diferenciar maiúsculas nem acentos. O mesmo vale para a sigla das unidades de medida. O mesmo nome SHALL poder existir em listas diferentes.

#### Scenario: Mesmo nome com acento e maiúscula diferentes

- **WHEN** já existe o item do catálogo "Pão francês" e um item "PAO FRANCES" é gravado
- **THEN** o banco recusa a gravação por nome duplicado

#### Scenario: Sigla duplicada

- **WHEN** já existe a unidade de sigla "kg" e uma unidade de sigla "KG" é gravada
- **THEN** o banco recusa a gravação por sigla duplicada

#### Scenario: Mesmo nome em listas diferentes

- **WHEN** existe a categoria "Outros" e um motivo de cancelamento "Outros" é gravado
- **THEN** o banco aceita a gravação

### Requirement: Termos proibidos gravados normalizados

O sistema SHALL gravar cada termo proibido em minúsculas e sem acentos, para que a validação de textos livres compare o texto do usuário normalizado da mesma forma.

#### Scenario: Termo do seed normalizado

- **WHEN** o seed cria os termos proibidos
- **THEN** todos os termos gravados estão em minúsculas e sem acentos

### Requirement: Motivos de cancelamento de sistema

O sistema SHALL marcar como motivos de sistema exatamente "Conta encerrada pela instituição", "Pedido expirado sem resposta" e "Alimento vencido". O backend SHALL acessar esses motivos pelo nome, por meio de uma constante única, nunca por texto solto no código. Os demais motivos SHALL ficar marcados como comuns.

#### Scenario: Motivos de sistema após o seed

- **WHEN** o seed roda num banco vazio
- **THEN** existem exatamente três motivos de cancelamento marcados como de sistema, com os três nomes acima

#### Scenario: Motivos comuns após o seed

- **WHEN** o seed roda num banco vazio
- **THEN** os motivos "Não poderei retirar no prazo", "Alimento não está mais disponível", "Solicitação feita por engano" e "Outro" existem marcados como comuns

### Requirement: Tabela de sugestões

O sistema SHALL manter as sugestões de novas opções com tipo (categoria, item do catálogo, unidade de medida ou motivo de cancelamento), texto, status (`Pendente`, `Aprovada` ou `Recusada`, com `Pendente` ao criar), a instituição que sugeriu e, depois da decisão, o administrador que decidiu e o momento da decisão.

#### Scenario: Sugestão nova nasce pendente

- **WHEN** uma sugestão é gravada sem status informado
- **THEN** ela fica com o status `Pendente`, sem administrador e sem momento de decisão

### Requirement: Seeds iniciais das listas

O seed SHALL criar, além dos papéis, status e categorias existentes: as unidades de medida Unidade (un), Quilograma (kg), Grama (g), Litro (L), Mililitro (mL), Caixa (cx), Pacote (pct) e Dúzia (dz), em que só Quilograma e Litro aceitam fração; os motivos de cancelamento de sistema e comuns; uma lista inicial de termos proibidos; e um catálogo provisório de alimentos, com cada item ligado a uma das categorias do seed. O seed SHALL ser idempotente: rodá-lo de novo SHALL NOT duplicar nem alterar registros existentes.

#### Scenario: Banco recriado

- **WHEN** o banco é recriado e o seed roda
- **THEN** as cinco listas existem com os registros iniciais, e todo item do catálogo tem categoria

#### Scenario: Unidades que aceitam fração

- **WHEN** o seed roda num banco vazio
- **THEN** só as unidades "kg" e "L" ficam marcadas como aceitando quantidade fracionada

#### Scenario: Seed executado duas vezes

- **WHEN** o seed roda duas vezes seguidas
- **THEN** a quantidade de registros de cada lista é a mesma após a primeira e a segunda execução
