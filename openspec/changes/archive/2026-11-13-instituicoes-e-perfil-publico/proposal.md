## Why

Hoje uma instituição só conhece a outra pelo nome que aparece num alimento ou num pedido: não há como procurar
parceiros nem ver quem é a outra parte antes de pedir ou aceitar. O RF10 pede a listagem das instituições do tipo
oposto, com busca, e o RF12 e o RF13 pedem o perfil público de cada uma, com dados mínimos (RN36) e sem nada de quem
está excluído (RN35). É o item 4.3 do plano, que depende da 4.2 (`perfil-completo`, já em `develop`), em que o nome
fantasia passou a ser editável e virou o nome público da instituição.

## What Changes

Cobre **RF10, RF12, RF13, RN35 e RN36**, com as decisões novas **DT41, DT42 e DT43** (abaixo).

### Backend

- **Listagem (RF10):** `GET /establishments` (só entidade beneficiária) e `GET /beneficiary-entities` (só
  estabelecimento), paginadas no padrão da DT23, com `search` (nome fantasia, razão social, CNPJ e descrição, sem
  diferenciar maiúsculas nem acentos), `city` e `state`. Cada item traz só `id`, `name` (nome fantasia ou, sem ele,
  razão social), `image` (URL de `/files/...`), `city` e `state`.
- **Perfil público (RF12, RF13):** `GET /establishments/:id` (só entidade) e `GET /beneficiary-entities/:id` (só
  estabelecimento), com `id`, `name`, `image`, `description`, `city` e `state`. Nenhum contato, endereço, CNPJ, razão
  social em separado ou dado do responsável (RN36). Instituição excluída, inexistente ou com e-mail não confirmado
  responde `404`.
- **Alimentos do estabelecimento (RF13):** filtro novo `establishmentId` no `GET /foods` (feed), que já devolve só
  dados públicos do estabelecimento. Vale o recorte do feed (DT42).
- **Pedidos entre as duas (RF12):** filtro novo `beneficiaryEntityId` no `GET /orders`, sempre combinado com o recorte
  da sessão: o estabelecimento vê só os pedidos dele com aquela entidade. Pedidos excluídos logicamente continuam fora
  (RN35).
- Papel errado responde `403` com `code: ROLE_NOT_ALLOWED`, como nas outras rotas de instituição. O `/me` continua
  igual.

### Frontend

- Item novo no menu do topo: **"Estabelecimentos"** para a entidade e **"Entidades"** para o estabelecimento, com a
  tela "Listar Instituições" do protótipo: busca, cidade, UF, contador, grade de cards (avatar, nome, cidade/UF) e
  paginação com "Itens por página".
- Tela "Perfil Público" do protótipo, **sem** contato, endereço, CNPJ e data de cadastro:
  - do estabelecimento (visão da entidade): cabeçalho com `UserAvatar`, nome, cidade/UF, "Sobre" e a grade de
    alimentos disponíveis, reaproveitando o card do feed, com paginação;
  - da entidade (visão do estabelecimento): cabeçalho igual e "Histórico de pedidos" ("Pedidos entre você e esta
    entidade"), com abas Todos + os cinco status, contagem, tabela (alimento, data, quantidade, status) e ação "Ver"
    para o detalhe do pedido.
- Links para o perfil público (DT43): nome do estabelecimento no card do feed e no detalhe do alimento (só para a
  entidade), e nome da outra parte no detalhe do pedido (para as duas).
- Perfil de instituição excluída ou inexistente mostra "Instituição não encontrada", com volta para a listagem.

### Documentação

- `docs/REQUISITOS.md`: DT41, DT42 e DT43 novas, citadas na observação do RF10, RF12 e RF13. A coluna "Situação"
  fica como está (compara com o MVP).
- `docs/PLANO-IMPLEMENTACAO.md`: item 4.3 marcado ✅ ao fim.

**Decisões tomadas com a dupla antes da proposta:**

- **DT41:** a listagem (RF10) e o perfil público (RF12, RF13) mostram só instituições não excluídas **e com e-mail
  confirmado** (RN47). Conta não confirmada não loga e é apagada em 24 horas (RN48), então não aparece; o perfil dela
  responde `404`, como o de uma excluída.
- **DT42:** os alimentos do perfil público do estabelecimento (RF13) seguem o mesmo recorte do feed (RF20): status
  `Ativo`, não excluído, não vencido e com quantidade maior que zero. Alimento `Ativo` vencido ou zerado não aparece,
  porque não abre detalhe nem aceita pedido.
- **DT43:** o nome da instituição vira link para o perfil público no card do feed e no detalhe do alimento (só quando
  quem vê é a entidade, porque o estabelecimento não vê perfil de estabelecimento) e no detalhe do pedido (para as duas
  partes). O item do menu tem o nome do tipo oposto: "Estabelecimentos" para a entidade, "Entidades" para o
  estabelecimento.

### Divergências do protótipo

- O protótipo mostra CNPJ, e-mail, celular com WhatsApp, endereço e "Cadastrada em" no perfil público. Nada disso
  entra (RN36, DT08; tabela "Continuam fora" do plano).
- A aba "Ativo" do histórico de pedidos do protótipo é o status `Pendente` (DT01).

### Fora desta change

- Exclusão da própria conta (RF04, RF05, RN28–RN30): 4.4 `exclusao-propria-conta`.
- Listagem e perfil completo de instituições para o administrador (RF47, RF48, RF57, RF58): 5.2 `admin-instituicoes`.
- WhatsApp e contato no perfil público: continuam só no detalhe do pedido `Em andamento` (RN12, RF09).
- Métricas públicas na landing page e no login: continuam em `docs/PENDENCIAS.md`, como opcionais.

## Capabilities

### New Capabilities

- `instituicoes/listagem`: listagem paginada das instituições do tipo oposto, com busca, filtros e dados públicos
  mínimos, e a tela correspondente com o item novo no menu.
- `instituicoes/perfil-publico`: perfil público do estabelecimento (com alimentos disponíveis) e da entidade (com os
  pedidos entre as duas), com o recorte de exclusão e de e-mail confirmado.

### Modified Capabilities

- `alimentos/listagem`: filtro `establishmentId` na busca do feed; nome do estabelecimento no card vira link para o
  perfil público, para a entidade.
- `alimentos/detalhe`: nome do estabelecimento na tela de detalhe vira link para o perfil público, para a entidade.
- `pedidos/listagem`: filtro `beneficiaryEntityId`, combinado com o recorte da sessão.
- `pedidos/detalhe`: nome da outra parte na tela de detalhe vira link para o perfil público.

## Impact

- **Backend:** `establishments/` e `beneficiary-entities/` (controllers, services, DTOs novos de query e de resposta
  pública, testes), `foods/dto/list-foods-query.dto.ts` e o `buildAvailableAndFilteredWhere` do `FoodsService`,
  `orders/dto/list-orders-query.dto.ts` e o `list()` do `OrdersService`. Sem migration.
- **Frontend:** feature nova `features/institutions/` (API, listagem, perfil público), `components/layout/nav-items.ts`,
  `app/router.tsx`, `features/foods/` (`foods-api.ts`, `food-card.tsx`, `food-detail-page.tsx`) e
  `features/orders/` (`orders-api.ts`, `use-order-counts.ts`, detalhe do pedido).
- **API:** compatível com os clientes atuais. Quatro rotas `GET` novas e dois filtros opcionais novos; nenhuma
  resposta existente muda.
- **Docs:** `docs/REQUISITOS.md` (DT41–DT43) e `docs/PLANO-IMPLEMENTACAO.md`.
