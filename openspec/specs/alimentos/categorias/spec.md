# alimentos/categorias Specification

## Purpose

Permitir que estabelecimentos e entidades beneficiárias autenticados obtenham a lista de categorias de alimento, com busca sem acento, para o filtro de busca por categoria (RF20) e a seleção de categoria nos formulários. A rota fica no módulo das listas padronizadas (`GET /catalog/categories`).

## Requirements

### Requirement: Listagem das categorias de alimento

O sistema SHALL permitir que um estabelecimento ou uma entidade beneficiária autenticados obtenham a lista de categorias de alimento cadastradas, cada uma com `id` e `name`. A lista SHALL ser retornada ordenada por `id`, a ordem do seed. Não há paginação. A requisição SHALL aceitar um termo de busca opcional que filtra as categorias pelo nome, sem diferenciar maiúsculas nem acentos; termo vazio ou só com espaços SHALL ser tratado como ausente. O administrador SHALL NOT usar esta listagem: ele gerencia as categorias pelo painel.

#### Scenario: Instituição autenticada obtém a lista de categorias

- **WHEN** um estabelecimento autenticado solicita a lista de categorias sem termo de busca
- **THEN** o sistema retorna todas as categorias cadastradas, cada uma com `id` e `name`, ordenadas por `id`

#### Scenario: Busca sem acento e sem diferenciar maiúsculas

- **WHEN** uma entidade beneficiária autenticada solicita a lista de categorias com o termo "PAES"
- **THEN** o sistema retorna a categoria "Pães e Massas" e nenhuma categoria cujo nome não contenha o termo

#### Scenario: Termo de busca vazio

- **WHEN** um estabelecimento autenticado solicita a lista de categorias com o termo de busca só com espaços
- **THEN** o sistema retorna todas as categorias, como sem termo

#### Scenario: Requisição sem sessão autenticada

- **WHEN** a lista de categorias é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso com `401` e não retorna nenhuma categoria

#### Scenario: Administrador não usa a listagem das instituições

- **WHEN** um administrador autenticado solicita a lista de categorias
- **THEN** o sistema nega o acesso com `403` e `code` `ROLE_NOT_ALLOWED`

#### Scenario: Papel do usuário não altera a lista

- **WHEN** um estabelecimento e uma entidade beneficiária solicitam a lista de categorias no mesmo momento
- **THEN** ambos recebem exatamente o mesmo conjunto de categorias
