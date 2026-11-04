## MODIFIED Requirements

### Requirement: Formulário de cadastro de alimento

O modal "Cadastrar Alimento" SHALL usar as listas padronizadas, sem texto livre para alimento ou unidade, e com a ação "Sugerir nova opção" nos dois selects: um select com busca sem acento no catálogo de alimentos, que mostra a categoria do item escolhido sem permitir editá-la; um select com busca das unidades de medida, por nome ou sigla; uma escolha do tipo de solicitação entre as três opções; o campo de observações, opcional; e, no topo do formulário, uma área de upload da foto do alimento que aceita clique ou arrastar e soltar e mostra a prévia da imagem escolhida. O formulário SHALL validar antes de enviar a quantidade fracionada pela unidade escolhida e a regra do "Somente parcial", e SHALL mostrar no campo certo os erros devolvidos pelo servidor.

#### Scenario: Busca sem acento no select do catálogo

- **WHEN** o estabelecimento digita "pao" no select de alimento
- **THEN** o select mostra "Pão francês", "Pão de forma" e os demais itens que contêm o trecho

#### Scenario: Busca no select de unidade

- **WHEN** o estabelecimento digita "kg" no select de unidade
- **THEN** o select mostra "Quilograma (kg)"

#### Scenario: Sugestão sem perder o formulário

- **WHEN** o estabelecimento escolhe "Sugerir nova opção" no select de alimento e envia a sugestão
- **THEN** o modal continua aberto, com os dados já preenchidos

#### Scenario: Categoria preenchida pelo alimento

- **WHEN** o estabelecimento escolhe "Queijo muçarela" no select de alimento
- **THEN** o formulário mostra a categoria "Laticínios", sem permitir alterá-la

#### Scenario: Fração em unidade que não aceita

- **WHEN** o estabelecimento informa quantidade 2.5 com a unidade "Unidade"
- **THEN** o formulário mostra o erro no campo de quantidade e não envia o cadastro

#### Scenario: Foto arrastada para a área de upload

- **WHEN** o estabelecimento arrasta uma imagem PNG válida para a área de upload
- **THEN** a prévia da imagem aparece dentro da área, e arrastar um arquivo PDF mostra o erro de formato no campo da foto

#### Scenario: Alimento aparece no feed depois do cadastro

- **WHEN** o estabelecimento conclui um cadastro válido
- **THEN** o modal fecha, e o alimento aparece no feed com o nome do catálogo, a categoria, a unidade e a imagem enviada
