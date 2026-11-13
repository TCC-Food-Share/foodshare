## Purpose

Permitir que cada instituição encontre as instituições do tipo oposto (a entidade procura estabelecimentos, o
estabelecimento procura entidades), com busca e só com os dados públicos mínimos (RF10, RN35, RN36).

## ADDED Requirements

### Requirement: Listagem das instituições do tipo oposto

O sistema SHALL permitir que uma instituição autenticada liste as instituições do tipo oposto ao seu: a entidade
beneficiária lista estabelecimentos (`GET /establishments`) e o estabelecimento lista entidades beneficiárias
(`GET /beneficiary-entities`). A listagem SHALL incluir só instituições não excluídas logicamente (RN35) cujo usuário
tem o e-mail confirmado (DT41). Cada item SHALL trazer **somente** os dados públicos da listagem (RF10, RN36):

- `id`;
- `name`: o nome fantasia ou, quando a instituição não tem nome fantasia, a razão social;
- `image`: a URL da rota de leitura da imagem (`/files/...`), ou `null` se não houver imagem;
- `city` e `state`: o município e a UF do endereço.

A resposta NÃO SHALL conter, em nenhum item, CNPJ, razão social em campo separado, descrição, e-mail ou celular
(institucional ou pessoal), endereço além de município e UF, nome do responsável, data de cadastro ou o marcador de
exclusão.

#### Scenario: Entidade lista estabelecimentos

- **WHEN** uma entidade beneficiária autenticada solicita `GET /establishments`
- **THEN** o sistema retorna a página de estabelecimentos não excluídos e com e-mail confirmado, cada um só com `id`,
  `name`, `image`, `city` e `state`

#### Scenario: Estabelecimento lista entidades

- **WHEN** um estabelecimento autenticado solicita `GET /beneficiary-entities`
- **THEN** o sistema retorna a página de entidades beneficiárias não excluídas e com e-mail confirmado, cada uma só
  com `id`, `name`, `image`, `city` e `state`

#### Scenario: Nome público sem nome fantasia

- **WHEN** um estabelecimento listado não tem nome fantasia
- **THEN** o `name` do item é a razão social dele

#### Scenario: Nome público com nome fantasia

- **WHEN** um estabelecimento listado tem nome fantasia
- **THEN** o `name` do item é o nome fantasia, e a razão social não aparece em nenhum campo

#### Scenario: Instituição excluída não aparece

- **WHEN** existe um estabelecimento excluído logicamente
- **THEN** ele não aparece na listagem nem conta no `total`

#### Scenario: Instituição com e-mail não confirmado não aparece

- **WHEN** existe uma entidade beneficiária recém-cadastrada que ainda não confirmou o e-mail
- **THEN** ela não aparece na listagem do estabelecimento nem conta no `total`

#### Scenario: Resposta sem dado privado

- **WHEN** a listagem é retornada
- **THEN** nenhum item contém CNPJ, descrição, e-mail, celular, CEP, rua, número, complemento, nome do responsável
  ou data de cadastro

#### Scenario: Estabelecimento tenta listar estabelecimentos

- **WHEN** um estabelecimento autenticado solicita `GET /establishments`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Entidade tenta listar entidades

- **WHEN** uma entidade beneficiária autenticada solicita `GET /beneficiary-entities`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Administrador tenta listar instituições

- **WHEN** um administrador autenticado solicita qualquer uma das duas listagens
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Requisição sem sessão

- **WHEN** a listagem é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhuma instituição

### Requirement: Busca e filtros da listagem de instituições

O sistema SHALL aceitar os parâmetros opcionais `search`, `city` e `state`, combinados por E:

- `search` — casa a instituição cujo nome fantasia, razão social ou descrição contém o texto, sem diferenciar
  maiúsculas nem acentos. Quando o texto tem só dígitos e a pontuação do CNPJ (`.`, `/`, `-`), SHALL casar também
  com o CNPJ, comparando só os dígitos (com ou sem pontuação, "12345678" e "12.345.678" casam o mesmo CNPJ).
- `city` — casa a instituição cujo município contém o texto, sem diferenciar maiúsculas nem acentos.
- `state` — casa a instituição cuja UF é exatamente a informada (2 letras, normalizada para maiúsculas).

Cada texto SHALL ser aparado nas pontas; vazio depois de aparado SHALL ser ignorado. `search` e `city` aceitam até
200 caracteres; acima disso, ou `state` fora do formato de 2 letras, a requisição SHALL ser recusada com `400`. A busca
SHALL ser aplicada sempre dentro do recorte da listagem: nunca traz instituição excluída ou com e-mail não confirmado.
Casar pela razão social ou pelo CNPJ NÃO SHALL fazer esses dados aparecerem na resposta.

#### Scenario: Busca pelo nome fantasia sem acento

- **WHEN** a entidade busca com `search` igual a "padaria sao jose" e existe o estabelecimento "Padaria São José"
- **THEN** o sistema retorna esse estabelecimento

#### Scenario: Busca pela razão social

- **WHEN** a entidade busca por um trecho da razão social de um estabelecimento que tem nome fantasia diferente
- **THEN** o sistema retorna o estabelecimento, com `name` igual ao nome fantasia

#### Scenario: Busca pela descrição

- **WHEN** o estabelecimento busca com `search` igual a "abrigo" e uma entidade tem "abrigo" na descrição
- **THEN** o sistema retorna essa entidade

#### Scenario: Busca pelo CNPJ com e sem pontuação

- **WHEN** a entidade busca com `search` igual a "12.345.678" e, depois, igual a "12345678"
- **THEN** as duas buscas retornam o estabelecimento de CNPJ "12.345.678/0001-90", sem CNPJ na resposta

#### Scenario: Texto com letras não compara o CNPJ

- **WHEN** a entidade busca com `search` igual a "Padaria 2"
- **THEN** o sistema compara o texto só com nome fantasia, razão social e descrição, e não traz estabelecimentos
  apenas porque o CNPJ contém o dígito 2

#### Scenario: Filtro por cidade e UF

- **WHEN** o estabelecimento filtra com `city` igual a "birigui" e `state` igual a "sp"
- **THEN** o sistema retorna só as entidades de município contendo "Birigui" e UF "SP"

#### Scenario: Filtros combinados

- **WHEN** a entidade informa `search` e `state` ao mesmo tempo
- **THEN** o sistema retorna só os estabelecimentos que casam com os dois

#### Scenario: Busca não traz instituição excluída

- **WHEN** um estabelecimento excluído logicamente tem o nome que casa com o `search`
- **THEN** ele não é retornado

#### Scenario: Busca vazia

- **WHEN** a listagem é pedida com `search` só com espaços
- **THEN** o sistema retorna a listagem completa, como sem busca

#### Scenario: Busca longa demais

- **WHEN** a listagem é pedida com `search` de 201 caracteres
- **THEN** o sistema responde `400` e não retorna a listagem

#### Scenario: Busca sem resultados

- **WHEN** nenhum item casa com os filtros
- **THEN** o sistema retorna a lista vazia e `total` igual a 0, sem erro

### Requirement: Paginação e ordenação da listagem de instituições

A listagem SHALL ser paginada no padrão da DT23: `page` (a partir de 1, padrão 1) e `pageSize` (10, 20, 50 ou 100,
padrão 10), com resposta `{ data, total, page, pageSize }`. Outro `pageSize`, ou `page` não inteiro ou menor que 1,
SHALL ser recusado com `400`. Os itens SHALL vir em ordem alfabética do `name`, sem diferenciar maiúsculas nem
acentos, e, em empate, pelo `id`.

#### Scenario: Listagem sem parâmetros de paginação

- **WHEN** a listagem é pedida sem `page` e `pageSize`
- **THEN** o sistema retorna a primeira página com até 10 itens e o `total` do recorte

#### Scenario: pageSize fora dos valores permitidos

- **WHEN** a listagem é pedida com `pageSize` igual a 15
- **THEN** o sistema responde `400`

#### Scenario: Ordem alfabética pelo nome público

- **WHEN** existem os estabelecimentos "Açougue Bom Corte", "Padaria Central" e um sem nome fantasia com razão
  social "Mercado Aurora Ltda"
- **THEN** a ordem é "Açougue Bom Corte", "Mercado Aurora Ltda" e "Padaria Central"

#### Scenario: Total reflete a busca

- **WHEN** a listagem é pedida com `search` que casa 3 instituições e `pageSize` igual a 10
- **THEN** o `total` é 3

### Requirement: Tela de listagem de instituições

O frontend SHALL ter um item novo no menu do topo, só para instituições: "Estabelecimentos" para a entidade
beneficiária e "Entidades" para o estabelecimento (DT43). O item SHALL abrir a tela de listagem do tipo oposto, com o
mesmo título do item, contendo: campo de busca ("Buscar por nome, CNPJ ou descrição"), filtro de cidade, select de
UF, o contador de resultados ("N estabelecimentos encontrados" ou "N entidades encontradas", no singular quando for
1), a grade de cards (imagem pelo `UserAvatar` com fallback de iniciais, nome, cidade/UF) e a paginação com o select
"Itens por página". Busca, filtros e página SHALL ficar na URL. Cada card SHALL abrir o perfil público da instituição.
A tela NÃO SHALL mostrar contato, endereço, CNPJ nem botão de WhatsApp. O estabelecimento NÃO SHALL acessar a tela de
estabelecimentos, nem a entidade a de entidades.

#### Scenario: Entidade abre a listagem pelo menu

- **WHEN** a entidade clica em "Estabelecimentos" no menu
- **THEN** a tela mostra a grade de estabelecimentos com nome, imagem e cidade/UF, e o contador

#### Scenario: Estabelecimento vê o item "Entidades"

- **WHEN** um estabelecimento está logado
- **THEN** o menu mostra "Entidades", e não "Estabelecimentos"

#### Scenario: Card sem imagem

- **WHEN** a imagem de uma instituição não existe ou falha ao carregar
- **THEN** o card mostra as iniciais do nome no lugar da imagem

#### Scenario: Busca sem resultado na tela

- **WHEN** a busca não encontra nenhuma instituição
- **THEN** a tela mostra um estado vazio com a opção de limpar os filtros

#### Scenario: Recarregar mantém a busca

- **WHEN** a pessoa busca, troca de página e recarrega a tela
- **THEN** a busca, os filtros e a página continuam aplicados

#### Scenario: Rota do tipo errado

- **WHEN** um estabelecimento acessa direto o endereço da listagem de estabelecimentos
- **THEN** o frontend redireciona para a tela inicial do papel, sem chamar a API

#### Scenario: Tela em largura de celular

- **WHEN** a listagem é aberta numa tela de 400 px de largura
- **THEN** os filtros e os cards ficam em uma coluna, sem rolagem horizontal
