## 1. Backend: busca na listagem

- [x] 1.1 Mover `trimToUndefined` de `foods/dto/list-my-foods-query.dto.ts` para `common/` e usar nas duas DTOs
- [x] 1.2 Em `ListOrdersQueryDto`, adicionar `search?` (`@IsOptional`, `@Transform(trimToUndefined)`, `@IsString`, `@MaxLength(100)`) com `@ApiPropertyOptional` descrevendo alimento, estabelecimento e data `dd/mm/aaaa`
- [x] 1.3 Em `OrdersService.list`, quando houver `search`, buscar os ids pelo `$queryRaw` do design D2 (`unaccent`, nome do alimento, razão social e nome fantasia do estabelecimento, data em `America/Sao_Paulo`), com o recorte de dono e `deleted = false` no mesmo `WHERE`, e acrescentar `id: { in: ids }` ao `where` do `findMany` e do `count`. Conferir nomes de tabela e coluna no `schema.prisma` e o tipo de `orderDate` (design D2)
- [x] 1.4 Atualizar o `@ApiOperation` de `GET /orders` no controller (RF27, `search`) e a resposta `400` (`search` longo)

## 2. Backend: contato e aviso no detalhe

- [x] 2.1 Em `order-detail-response.dto.ts`, criar `OrderAddressDto` (`postalCode`, `street`, `number`, `complement`, `city`, `state`) e acrescentar a `OrderInstitutionDetailDto` `institutionalEmail`, `institutionalPhone` e `address`, todos `nullable`; acrescentar `quantityUpdatedAt` (`Date | null`) a `OrderDetailResponseDto`
- [x] 2.2 Em `getById`, passar o papel do solicitante para `toDetailResponse`, que devolve contato e endereço só da outra parte e só se o status é `Em andamento` (design D3); a própria instituição e os demais status saem com `null`. Não filtrar `deleted` das instituições (design D4)
- [x] 2.3 Atualizar o `@ApiOperation` de `GET /orders/:id` no controller (RF28, RN12, acesso após exclusão lógica)

## 3. Backend: testes

- [x] 3.1 Testar a busca em `orders.service.spec.ts`: por alimento, por razão social e por nome fantasia, por data completa e parcial, sem acento e sem diferença de maiúsculas, combinada com status e paginação (`total` correto), sem resultado, vazia, sem vazar pedido de outra instituição e sem trazer pedido excluído
- [x] 3.2 Testar o fuso: pedido às 22:30 de Brasília casa a data do dia local e não a do dia seguinte em UTC
- [x] 3.3 Testar a DTO em `list-orders-query.dto.spec.ts`: `search` aparado, vazio vira ausente, 100 caracteres passa e 101 é recusado
- [x] 3.4 Testar o contato no detalhe: `Em andamento` traz e-mail, celular e endereço da outra parte nos dois papéis; a própria instituição vem `null`; `Pendente`, `Rejeitado`, `Doado` e `Cancelado` vêm `null` nas duas; conferir que a resposta não tem dado pessoal (e-mail pessoal, celular pessoal, responsável)
- [x] 3.5 Testar o acesso após exclusão lógica: com `Establishment.deleted = true` (e com `BeneficiaryEntity.deleted = true`) o detalhe responde à outra parte; pedido com `deleted = true` segue `404`
- [x] 3.6 Testar `quantityUpdatedAt` no detalhe: preenchido quando o total pendente foi ajustado, `null` caso contrário

## 4. Frontend: API e helper

- [x] 4.1 Em `orders-api.ts`: `search` em `listOrders`; `institutionalEmail`, `institutionalPhone` e `address` em `OrderInstitution`; `quantityUpdatedAt` em `OrderDetail`
- [x] 4.2 Criar `lib/whatsapp.ts` com `whatsappUrl(phone)` (design D6: só dígitos, 11 dígitos, prefixo `55`, senão `null`) e o teste de unidade (máscara, parênteses, 10 e 11 dígitos)

## 5. Frontend: busca na listagem

- [x] 5.1 Extrair o campo de busca do `AdminTable` para um componente reutilizável (ou criar `SearchInput` em `components/`), com o debounce de 300 ms do design D7, sem mudar a tela de "Meus alimentos"
- [x] 5.2 Em `OrdersPage`, ler e gravar `search` no endereço junto de `status`, `page` e `pageSize`, voltar à página 1 ao mudar o texto e manter o texto ao trocar de aba; incluir `search` na `queryKey` da listagem
- [x] 5.3 Em `use-order-counts.ts`, receber `search` e repassar às cinco consultas, com `search` na `queryKey`
- [x] 5.4 Em `OrdersEmptyState`, tratar busca sem resultado ("Nenhum pedido corresponde à busca" com "Limpar busca"), sem trocar o estado de quem ainda não tem pedidos
- [x] 5.5 Atualizar o texto de ajuda do campo para citar alimento, estabelecimento e data

## 6. Frontend: contato e aviso no detalhe

- [x] 6.1 Criar `CounterpartContactCard` em `order-detail-cards.tsx` (ou arquivo próprio): e-mail, celular com o botão do WhatsApp (`<a target="_blank" rel="noopener noreferrer">`, só se `whatsappUrl` devolver link) e endereço completo (rua, número, complemento, CEP, município e UF). Sem emoji, texto da instituição sem a palavra "administrador"
- [x] 6.2 Em `order-detail-page.tsx`, renderizar o card só quando o pedido está `Em andamento` e a outra parte traz contato; fora disso, nada
- [x] 6.3 No `OrderSummaryCard`, mostrar "Quantidade atualizada pelo estabelecimento em <data>" quando `quantityUpdatedAt` existe, com `formatLocalDate`
- [x] 6.4 Conferir o card de contato e a busca a 400 px (o app não tem modo escuro)

## 7. Documentação

- [x] 7.1 Em `docs/REQUISITOS.md`, registrar a DT34 (busca em campo único, data `dd/mm/aaaa` no fuso de Brasília) e a DT35 (botão do WhatsApp só com 11 dígitos), se a dupla confirmar

## 8. Verificação

- [x] 8.1 Rodar lint, testes e build de backend e frontend, com o `start:dev` desligado no build do backend
- [x] 8.2 Conferir o JSON de `GET /orders/:id` com `curl` autenticado: contato e endereço só na outra parte e só em `Em andamento`; `null` nos demais status e na própria instituição; sem dado pessoal. Conferir também `GET /orders?search=…` (alimento, estabelecimento, data, acento)
- [x] 8.3 Verificar ponta a ponta no navegador, com estabelecimento e entidade:
  - buscar por alimento, por estabelecimento e por data, com abas e contagens seguindo a busca, e "Limpar busca";
  - recarregar a página mantendo `?search=`;
  - abrir pedido `Em andamento` dos dois lados: card de contato e botão do WhatsApp abrindo `wa.me/55…` com o número certo;
  - confirmar o recebimento e ver o contato sumir do detalhe;
  - pedido `Pendente`, `Rejeitado`, `Doado` e `Cancelado` sem contato;
  - aviso de quantidade atualizada num pedido total ajustado pelo aceite;
  - detalhe de pedido cuja outra parte foi excluída logicamente;
  - console limpo
- [x] 8.4 Marcar ✅ no item 3.3 de `docs/PLANO-IMPLEMENTACAO.md`
