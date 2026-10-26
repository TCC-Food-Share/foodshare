## MODIFIED Requirements

### Requirement: Seeds iniciais das listas

O seed SHALL criar, além dos papéis, status e categorias existentes: as unidades de medida Unidade (un), Quilograma (kg), Grama (g), Litro (L), Mililitro (mL), Caixa (cx), Pacote (pct) e Dúzia (dz), em que só Quilograma e Litro aceitam fração; os motivos de cancelamento de sistema e comuns; uma lista inicial de termos proibidos; e o catálogo de alimentos curado a partir da Tabela TACO (4ª ed., NEPA/Unicamp), com nomes naturais, sem variações de preparo, sem bebidas alcoólicas, entre 150 e 250 itens, cada um ligado a uma das categorias do seed. O seed SHALL ser idempotente: rodá-lo de novo SHALL NOT duplicar nem alterar registros existentes.

#### Scenario: Banco recriado

- **WHEN** o banco é recriado e o seed roda
- **THEN** as cinco listas existem com os registros iniciais, e todo item do catálogo tem categoria

#### Scenario: Tamanho do catálogo curado

- **WHEN** o seed roda num banco vazio
- **THEN** o catálogo de alimentos tem entre 150 e 250 itens

#### Scenario: Nome natural, sem variação de preparo

- **WHEN** uma instituição busca "pao frances" no catálogo depois do seed
- **THEN** o sistema retorna um único item, "Pão francês", e nenhum item com "cru", "cozido" ou "frito" no nome

#### Scenario: Bebidas alcoólicas fora do catálogo

- **WHEN** uma instituição busca "cerveja" ou "aguardente" no catálogo depois do seed
- **THEN** o sistema não retorna nenhum item

#### Scenario: Alimento preparado é perecível

- **WHEN** uma instituição consulta o catálogo depois do seed
- **THEN** "Feijoada", "Estrogonofe de frango" e "Refeição pronta" aparecem na categoria "Perecíveis"

#### Scenario: Itens do catálogo provisório continuam existindo

- **WHEN** o seed da lista curada roda num banco que já tinha o catálogo provisório
- **THEN** os 24 itens provisórios continuam existindo, com os mesmos nomes, e a quantidade total passa a ser a da lista curada, sem duplicatas

#### Scenario: Unidades que aceitam fração

- **WHEN** o seed roda num banco vazio
- **THEN** só as unidades "kg" e "L" ficam marcadas como aceitando quantidade fracionada

#### Scenario: Seed executado duas vezes

- **WHEN** o seed roda duas vezes seguidas
- **THEN** a quantidade de registros de cada lista é a mesma após a primeira e a segunda execução
