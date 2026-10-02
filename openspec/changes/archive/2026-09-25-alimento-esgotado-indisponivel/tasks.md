## 1. Backend — filtro de disponibilidade

- [x] 1.1 `backend/src/foods/foods.service.ts`: `availableFoodWhereInput` ganha
      `quantity: { gt: 0 }` e `buildAvailableAndFilteredWhere` ganha
      a condição SQL `f.quantity > 0` (literal, sem parâmetro novo); manter o
      comentário de sincronia entre os dois. `orders.service.ts` não muda.
      Verificar: `npx tsc --noEmit -p tsconfig.json` limpo (**não** rodar `npm run
      build` com o `start:dev` ligado).

## 2. Backend — testes

- [x] 2.1 `backend/src/foods/foods.service.spec.ts`: `getById` e
      `findAvailableById` passam a esperar `quantity: { gt: 0 }` no `where`; o teste
      da listagem sem filtros passa a afirmar `f.quantity > 0` no SQL (os
      `values` não mudam — a condição é literal); um teste da busca completa
      também afirma a condição. Verificar: `npm test -- foods.service` verde.
- [x] 2.2 Conferir que `orders.service.spec.ts` segue verde (mocka
      `findAvailableById`) e rodar a suíte completa do backend
      (`npm test`), `npm run lint:check` e `npm run format:check`.

## 3. Verificação no sistema rodando

- [x] 3.1 Reproduzir o cenário reportado com a API/browser (backend com `start:dev`
      já recarregando): estabelecimento cadastra alimento de 5 kg; entidade pede
      3 kg e o estabelecimento aceita; entidade pede 2 kg (total restante) e o
      estabelecimento aceita → quantidade 0. Conferir: alimento **some** de
      `GET /foods`, da busca por nome e do feed (para entidade **e** para o
      estabelecimento); `GET /foods/:id` → `404` e a tela "Alimento não
      encontrado"; `POST /orders` para ele → `404`; um terceiro pedido `Pendente`
      (criado antes de esgotar, por outra entidade) → aceitar dá `409`, o pedido
      segue `Pendente`, o toast do F8 diz "Estoque insuficiente…" e "Rejeitar"
      funciona; o detalhe do pedido continua mostrando o alimento com
      "Disponível agora 0 kg"; alimento com estoque restante (ex.: 5 → 3) segue
      no feed com a quantidade nova.

## 4. Documentação

- [x] 4.1 `docs/PLANO-FRONTEND.md`: a nota do F6 que diz que o "disponível" do
      backend não olha a quantidade passa a registrar que a change
      `alimento-esgotado-indisponivel` mudou isso (alimento esgotado sai da
      listagem/detalhe/pedido/aceite) e que o card "sem quantidade" ficou como rede
      de segurança.
