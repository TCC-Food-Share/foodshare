## Why

O cadastro de alimento ainda é o do MVP: nome e unidade em texto livre,
categoria escolhida à mão e imagem por URL. A versão final exige que o
alimento venha do catálogo (RN16), com unidade da lista, tipo de
solicitação e observações (RF14, DT06), e imagem enviada como arquivo
(RN41). O catálogo da TACO (1.2) e o upload de imagens (0.3) já estão
prontos, então a 2.1 pode entrar. Ela também é a base de "Meus Alimentos"
(2.2) e dos pedidos por tipo (3.1).

## What Changes

- **Schema (`Food`)**, conforme `docs/MODELO-DE-DADOS.md`:
  - saem `name`, `categoryId` e `quantityUnit`;
  - entram `catalogItemId`, `measurementUnitId`, `requestType`
    (`FoodRequestType`) e `notes` (opcional);
  - `image` passa a obrigatória;
  - entram os índices `(statusId, deleted)` e `(establishmentId, statusId)`;
  - `Category.foods` sai (a categoria vem do item do catálogo).
- **Backend: cadastro (`POST /foods`)**, em `multipart/form-data` com
  `@ImageUpload()` e imagem obrigatória na pasta `foods`. Valida:
  - item do catálogo e unidade existentes (`INVALID_CATALOG_ITEM`,
    `INVALID_MEASUREMENT_UNIT`);
  - quantidade fracionada só em unidade que aceita fração
    (`FRACTION_NOT_ALLOWED`);
  - "Somente parcial" só quando um pedido parcial é possível
    (`PARTIAL_ONLY_QUANTITY_TOO_LOW`, **decidido nesta proposta**).
  - **BREAKING:** o corpo JSON com `name`, `categoryId`, `quantityUnit` e
    `image` (URL) deixa de ser aceito. O único cliente é o nosso frontend,
    que muda junto.
- **Backend: feed (RF20) e detalhe (RF21):**
  - a busca por nome faz `JOIN` com o catálogo, mantendo o `unaccent`;
  - o filtro de categoria passa pelo item do catálogo;
  - o recorte de disponível passa a excluir alimentos de estabelecimento
    excluído (RF20, que o MVP não aplicava);
  - as respostas trazem `measurementUnit`, `requestType`, `notes`, o nome
    fantasia do estabelecimento e a imagem como URL (`toUrl`).
- **Backend: pedidos.** As respostas de pedido continuam com `food.name` e
  `food.quantityUnit`, agora vindos do catálogo e da sigla da unidade; a
  imagem do alimento no detalhe do pedido passa a vir como URL.
- **Frontend: modal "Cadastrar Alimento"** fiel ao protótipo:
  - select com busca no catálogo, que preenche a categoria (somente
    leitura);
  - select de unidade;
  - cartões de tipo de solicitação;
  - observações;
  - o componente de upload da 0.3;
  - validação de fração e de "Somente parcial" antes de enviar.
- **Frontend: feed e detalhe** mostram a unidade da lista, o tipo de
  solicitação, as observações, a data de publicação e o nome fantasia do
  estabelecimento.
- **Novo componente:** select com busca (Combobox do shadcn), reaproveitado
  depois pelos selects de motivo (3.2) e pelo painel (1.3). Dependências
  novas: `@radix-ui/react-popover` e `cmdk`.
- **Docs:** DT21 em `docs/REQUISITOS.md` com a regra do "Somente parcial".

## Cobertura

- **RF14** — cadastro com catálogo, unidade, tipo de solicitação,
  observações e imagem.
- **RF20** — feed com busca pelo nome do catálogo, unidade, nome do
  estabelecimento e recorte de estabelecimento excluído.
- **RF21** — detalhe com tipo de solicitação, observações, unidade e data de
  publicação.
- **RN15** — o alimento nasce `Ativo` e aparece na hora.
- **RN16** — nome e categoria vêm do catálogo; unidade da lista.
- **RN17** — tipo de solicitação escolhido no cadastro (a edição é da 2.2).
- **RN25** — data de publicação e dono preenchidos pelo servidor.
- **RN03** (parte do cadastro) — fração só em unidade que aceita fração.
- **RN38** (parte) — o select com busca sem acento nos formulários.

## Fora desta change

- "Sugerir nova opção" ao lado do select (RF71): 1.5.
- Validação de termos proibidos em descrição e observações (RNF07): 1.4.
- Editar, desativar, reativar e excluir alimento; "Meus Alimentos"
  (RF15–RF19): 2.2.
- Pedido por tipo, desconto de estoque e reserva (RF22, RN03 no pedido,
  RN07): 3.1. O modal "Solicitar doação" só troca a fonte da unidade.
- Imagem do alimento no painel (RF50): 5.4.

## Perguntas em aberto

Nenhuma. As duas decisões desta proposta foram tomadas com a dupla:

- **Dados de produção:** o banco da produção é recriado antes do deploy,
  como o do staging (P02). A migration não converte alimentos do MVP.
- **"Somente parcial":** o cadastro recusa quando nenhum pedido parcial é
  possível (vira a DT21).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `alimentos/cadastro`: cadastro pelo catálogo, unidade, tipo de
  solicitação, observações, imagem em arquivo e as validações novas; o
  formulário do modal.
- `alimentos/listagem`: dados novos no item, busca pelo nome do catálogo e
  recorte de estabelecimento excluído.
- `alimentos/detalhe`: dados novos e o mesmo recorte.
- `arquivos/imagens`: a URL da imagem vale também para alimentos, na pasta
  `foods`.

## Impact

- **Schema:** uma migration que exige a tabela `food` vazia. Local:
  `prisma migrate reset`. Staging e produção: banco limpo no Coolify antes
  do deploy.
- **Backend:** `foods/` (DTOs, service, controller, testes), `orders/`
  (`toResponse` e detalhe), `files/files.constants.ts` (pasta `foods`),
  `catalog` (sem mudança).
- **Frontend:** `features/foods/` (modal, schema, API, card, detalhe,
  filtros), `features/orders/` (tipos e unidade), um componente novo de
  select com busca e um arquivo de rótulos do tipo de solicitação.
- **Ambientes:** limpeza dos bancos de staging e produção no deploy.
