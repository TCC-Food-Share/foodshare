## Why

A listagem de pedidos só filtra por status (RF27 pede também busca por alimento, data e estabelecimento), e o
detalhe esconde e-mail, celular e endereço da outra parte. Sem o contato, o aceite não leva a lugar nenhum: as
duas instituições não conseguem combinar a retirada, que a plataforma não faz (fora do escopo). O RF09, o RF28 e a
RN12 definem que o contato aparece só enquanto o pedido está `Em andamento`, com link do WhatsApp.

## What Changes

- **Busca na listagem (RF27):** `GET /orders` ganha o parâmetro opcional `search`, no mesmo molde da busca de
  "Meus alimentos":
  - casa trecho do nome do alimento e do nome do estabelecimento (nome fantasia ou razão social), sem diferenciar
    maiúsculas nem acentos;
  - casa a data do pedido em `dd/mm/aaaa`, no fuso `America/Sao_Paulo`;
  - combina com o filtro de status, com a paginação e com o total.
- **Contato no detalhe (RF28, RN12):** `GET /orders/:id` passa a trazer, na instituição da **outra parte**,
  `institutionalEmail`, `institutionalPhone` e `address` (CEP, rua, número, complemento, cidade e UF), **só** quando
  o pedido está `Em andamento`. Nos demais status esses campos vêm `null`, e a instituição do próprio solicitante
  nunca os traz.
- **Acesso após exclusão lógica (RN12):** o detalhe continua respondendo às duas partes mesmo se qualquer uma das
  instituições estiver excluída logicamente. Fica coberto por teste e por cenário. O pedido com `deleted = true`
  segue respondendo `404` (RN14).
- **Aviso de quantidade (RN20, DT31, DT32):** o detalhe passa a trazer `quantityUpdatedAt`, e a tela mostra
  "Quantidade atualizada pelo estabelecimento em …" quando ele existe.
- **Frontend:**
  - campo de busca na listagem, com debounce, guardado no endereço (`?search=`), e contagem das abas seguindo a
    busca;
  - card de contato no detalhe do pedido `Em andamento`, com e-mail, celular, endereço e botão do WhatsApp
    (`https://wa.me/55…`, RF09);
  - o aviso de quantidade atualizada no resumo do pedido.
- **Documentação:** registrar em `docs/REQUISITOS.md` as duas decisões de comportamento desta change (DT34 e DT35,
  abaixo) e marcar ✅ o item 3.3 do plano.

**Decisões registradas nesta proposta** (não estão no `REQUISITOS.md`; ficam como DT34 e DT35 se a dupla concordar):

- **DT34:** a busca é um único campo livre, como em "Meus alimentos". A data aceita só `dd/mm/aaaa` (completa ou
  parcial, como `05/11`), contada no fuso de Brasília para bater com o que a tela mostra.
- **DT35:** o botão do WhatsApp só aparece quando o celular tem 11 dígitos (DDD + 9 dígitos). O cadastro aceita
  também número de 10 dígitos (fixo), que não tem WhatsApp: nesse caso a tela mostra o número sem o botão.

**Cobre:** RF09, RF27 (busca), RF28 e RN12. Mantém RN14, RN20, RN36 e DT27.

**Fica de fora (outras changes do plano):**

- listagem de instituições e perfil público, sem contato (4.3: RF10, RF12, RF13, RN36);
- exclusão lógica própria da conta e seus efeitos nos pedidos (4.4: RF04, RF05, RN28, RN29);
- pedidos no painel do administrador, que veem contato em qualquer status (5.5: RF54–RF56);
- mensagem pré-preenchida no WhatsApp e qualquer envio automático (n8n é de outra change).

**Perguntas em aberto:** nenhuma que bloqueie. Se a dupla discordar da DT34 ou da DT35, ajustar antes do apply.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pedidos/listagem`: novo requisito de busca por `search` (alimento, estabelecimento, data), combinada com
  status, paginação e total; a tela ganha o campo de busca e as contagens das abas seguem a busca.
- `pedidos/detalhe`:
  - o requisito de visualização deixa de proibir contato e endereço e passa a trazê-los na outra parte, só em
    `Em andamento` (RN12);
  - o detalhe continua acessível após a exclusão lógica de qualquer instituição;
  - o detalhe traz `quantityUpdatedAt`;
  - a tela ganha o card de contato com WhatsApp e o aviso de quantidade atualizada.

## Impact

- **Backend:**
  - `orders/dto/list-orders-query.dto.ts` (`search`);
  - `orders/orders.service.ts` (`list` com a busca, `getById` com o contato, `toDetailResponse`);
  - `orders/dto/order-detail-response.dto.ts` (contato, endereço e `quantityUpdatedAt`);
  - testes em `orders/orders.service.spec.ts` e `orders/dto/list-orders-query.dto.spec.ts`;
  - sem mudança de schema e sem migration.
- **API:**
  - `GET /orders` ganha `search` (campo novo, opcional);
  - `GET /orders/:id` ganha `quantityUpdatedAt` e, nas instituições, `institutionalEmail`,
    `institutionalPhone` e `address`, nulos fora de `Em andamento` e na própria instituição.
- **Frontend:**
  - `features/orders/orders-page.tsx`, `orders-api.ts` e `use-order-counts.ts` (busca);
  - `order-detail-cards.tsx` (card de contato e aviso) e `order-detail-page.tsx`;
  - helper do link do WhatsApp em `lib/` (formato internacional);
  - o campo de busca reaproveita o do `AdminTable`/"Meus alimentos" se couber, senão um input simples.
- **Dados:** nenhum. Sem reset de banco.
- **Privacidade:** é a primeira rota que devolve contato e endereço de outra instituição. O JSON precisa ser
  conferido (não só a tela) nos status diferentes de `Em andamento` e na própria instituição.
