# Modelo de dados — Food Share (versão final)

Este arquivo descreve o **alvo** do modelo de dados para a versão final e o
que muda em relação ao schema do MVP.

- **Fonte da verdade:** `backend/prisma/schema.prisma`. Assim que uma
  change aplicar uma parte deste arquivo, o schema passa a mandar. Não
  copie o schema inteiro para cá.
- As regras citadas (RN, DT, RF) estão em `docs/REQUISITOS.md`.
- Convenção de nomes: models e campos em inglês, tabelas em `snake_case`
  com `@@map`, como já é no MVP. No documento do TCC as tabelas aparecem
  em português; o mapeamento de nomes está no fim deste arquivo.

## Visão geral

| Model | Tabela | Situação | Resumo |
| ----- | ------ | -------- | ------ |
| `Role` | `role` | 🟡 dados | Entra o papel `Administrator` no seed |
| `User` | `user` | 🟡 muda | `personalPhone` passa a opcional (administrador não tem celular) |
| `Address` | `address` | ✅ igual | |
| `Establishment` | `establishment` | ✅ igual | |
| `BeneficiaryEntity` | `beneficiary_entity` | ✅ igual | |
| `Category` | `category` | 🟡 muda | Entra `administratorId`; `foods` vira `catalogItems` |
| `FoodStatus` | `food_status` | 🟡 dados | Seed: `Ativo`, `Reservado`, `Inativo` (sem `Revisar`, DT16) |
| `OrderStatus` | `order_status` | 🟡 dados | Seed: `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado` |
| `Food` | `food` | 🟡 muda | Nome/categoria vêm do catálogo; unidade vira FK; tipo de solicitação; observações |
| `CancellationReason` | `cancellation_reason` | 🟡 muda | Entra `isSystem`; `administratorId` opcional |
| `Order` | `order` | 🟡 muda | Entram `type`, `acceptedAt`, `quantityUpdatedAt` |
| `FoodCatalogItem` | `food_catalog_item` | 🆕 | Catálogo de alimentos (DT12) |
| `MeasurementUnit` | `measurement_unit` | 🆕 | Unidades de medida (RF59–RF62) |
| `ProhibitedTerm` | `prohibited_term` | 🆕 | Termos proibidos (RNF07, RF67–RF70) |
| `Suggestion` | `suggestion` | 🆕 | Sugestões de novas opções (RF49, RF71) |
| `OrderReminder` | `order_reminder` | 🆕 | Lembretes já enviados (RF73, RF74) |
| `AuditLog` | `audit_log` | 🆕 | Auditoria das ações do administrador (RNF14) |
| `AccessLog` | `access_log` | 🆕 | Registro de toda requisição à API, com usuário e IP (RNF13, DT19) |
| `Session`, `Account`, `Verification` | `session`, `account`, `verification` | ✅ igual | Tabelas do better-auth. Os códigos do `emailOTP` ficam em `verification` (DT03) |

`CodigoVerificacao`, do modelo do TCC, **não existe** (DT03).

## Enums novos

Decisão DT18. Para domínios fixos que o código usa em `if`/`switch`, o
modelo usa enum do Prisma: o TypeScript acusa valor errado antes de rodar, e
valor novo vira uma migration gerada pelo Prisma. `FoodStatus` e `OrderStatus` continuam como tabelas de domínio,
como no MVP.

| Enum | Valores | Usado em |
| ---- | ------- | -------- |
| `FoodRequestType` | `TOTAL_ONLY`, `PARTIAL_ONLY`, `TOTAL_OR_PARTIAL` | `Food.requestType` |
| `OrderType` | `TOTAL`, `PARTIAL` | `Order.type` |
| `SuggestionType` | `CATEGORY`, `FOOD_CATALOG_ITEM`, `MEASUREMENT_UNIT`, `CANCELLATION_REASON` | `Suggestion.type` |
| `SuggestionStatus` | `PENDING`, `APPROVED`, `REJECTED` | `Suggestion.status` |
| `OrderReminderKind` | `ENTITY_DAY_3`, `ENTITY_DAY_7`, `ESTABLISHMENT_DAY_5` | `OrderReminder.kind` |

O texto em português que aparece na tela ("Somente total", "Pendente" etc.)
fica no frontend, não no banco.

## Mudanças nos models existentes

### `Role` — só dados

- Seed acrescenta `Administrator`, além de `Establishment` e `BeneficiaryEntity`.

### `User`

| Campo | Mudança | Motivo |
| ----- | ------- | ------ |
| `personalPhone` | `String` → `String?` (continua `@unique`) | O administrador (RF29) não informa celular. O Postgres aceita vários `NULL` numa coluna única. A obrigatoriedade para instituições fica no DTO. |
| relações | `+ categories`, `+ catalogItems`, `+ measurementUnits`, `+ prohibitedTerms` (como `administrator`); `+ suggestions` (como `requester`) e `+ reviewedSuggestions` (como `reviewer`); `+ auditLogs`; `+ accessLogs` | Relações nomeadas de cada tabela nova |

A imagem continua opcional no banco. A obrigatoriedade (RF01, RF02, RF29)
fica no DTO.

### `Category`

| Campo | Mudança |
| ----- | ------- |
| `administratorId` | `+ Int?`, FK `User`, relação `"CategoryAdministrator"`. `NULL` nas categorias do seed. |
| `foods` | Sai. A categoria agora se liga a `FoodCatalogItem` (`catalogItems`). |

### `FoodStatus` / `OrderStatus` — só dados

- `FoodStatus` seed: `Ativo`, `Reservado`, `Inativo`. Não existe `Revisar`: não há aprovação manual de alimentos (DT16).
- `OrderStatus` seed: `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado`.
- Todo acesso por nome de status passa por uma constante única no backend
  (ex.: `ORDER_STATUS.IN_PROGRESS = 'Em andamento'`). Nada de string solta
  espalhada no código.

### `Food`

| Campo | Mudança | Regra |
| ----- | ------- | ----- |
| `name` | **sai** | RN16: o nome vem do item do catálogo |
| `categoryId` / `category` | **sai** | RN16: a categoria vem do item do catálogo |
| `quantityUnit` | **sai** | Substituído por `measurementUnitId` |
| `catalogItemId` | `+ Int`, FK `FoodCatalogItem` | RF14 |
| `measurementUnitId` | `+ Int`, FK `MeasurementUnit` | RF14 |
| `requestType` | `+ FoodRequestType` | RF14, RN17 |
| `notes` | `+ String? @db.VarChar(2000)` | Observações, opcional (DT06). Passa pela validação do RNF07 |
| `image` | `String?` → `String` | RF14: obrigatória. Guarda a **chave do objeto no MinIO**, não uma URL (ver "Imagens") |
| `publishedAt` | sem mudança (`DateTime`) | Data do cadastro, preenchida pelo servidor (RN25). O alimento nasce `Ativo` |
| `quantity` | sem mudança (`Decimal(10,2)`) | É o **estoque disponível**: o aceite desconta dele (RN07) |

Índices: `@@index([statusId, deleted])` para a listagem pública (RF20) e
`@@index([establishmentId, statusId])` para "Meus Alimentos" (RF19).

**Busca sem acento (RF20).** A busca do MVP usa `unaccent` com `$queryRaw`
sobre `food.name`. Com a saída de `name`, a consulta passa a fazer `JOIN` com
`food_catalog_item` e aplicar `unaccent` em `food_catalog_item.name`.

### `CancellationReason`

| Campo | Mudança | Regra |
| ----- | ------- | ----- |
| `isSystem` | `+ Boolean @default(false)` | RN31: motivos de sistema não aparecem para seleção e não podem ser editados nem excluídos |
| `administratorId` | `Int` → `Int?` | Motivos do seed (inclusive os de sistema) não têm administrador |

Seed:
- **Motivos de sistema** (`isSystem = true`): "Conta encerrada pela instituição", "Pedido expirado sem resposta", "Alimento vencido".
- **Motivos comuns:** "Não poderei retirar no prazo", "Alimento não está mais disponível", "Solicitação feita por engano", "Outro". A lista final é validada pela dupla.

Os três motivos de sistema são buscados pelo nome através de uma constante no backend, como os status.

### `Order`

| Campo | Mudança | Regra |
| ----- | ------- | ----- |
| `type` | `+ OrderType` | RN03, RN20: o pedido total acompanha o estoque |
| `acceptedAt` | `+ DateTime?` | Preenchido no aceite. Base dos lembretes da entidade (RF73) |
| `quantityUpdatedAt` | `+ DateTime?` | Preenchido quando um pedido total muda de quantidade por alteração de estoque (RN20). Mostrado no detalhe |
| `orderDate` | sem mudança | Base da expiração de 7 dias (RF72) e do lembrete do estabelecimento (RF74) |
| relações | `+ reminders OrderReminder[]` | |

Índices: `@@index([beneficiaryEntityId, statusId])` para o limite de 10 e a
duplicidade (RN04, RN05); `@@index([foodId, statusId])` para as rejeições
automáticas (RN07, RN08, RN20); `@@index([statusId, orderDate])` para a
tarefa de expiração (RF72).

## Models novos

### `FoodCatalogItem` → `food_catalog_item`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `name` | `String @unique @db.VarChar(200)` | |
| `categoryId` | `Int`, FK `Category` | P1: o item define a categoria |
| `administratorId` | `Int?`, FK `User` | `NULL` nos itens do seed |
| `createdAt` / `updatedAt` | padrão | |
| `foods` | `Food[]` | |

### `MeasurementUnit` → `measurement_unit`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `name` | `String @unique @db.VarChar(50)` | "Quilograma" |
| `abbreviation` | `String @unique @db.VarChar(10)` | "kg" |
| `allowsFraction` | `Boolean @default(false)` | RN03: quantidade com até 2 casas só se `true` |
| `administratorId` | `Int?`, FK `User` | |
| `createdAt` / `updatedAt` | padrão | |
| `foods` | `Food[]` | |

Seed:

| Nome | Sigla | Aceita fração |
| ---- | ----- | ------------- |
| Unidade | un | não |
| Quilograma | kg | sim |
| Grama | g | não |
| Litro | L | sim |
| Mililitro | mL | não |
| Caixa | cx | não |
| Pacote | pct | não |
| Dúzia | dz | não |

### `ProhibitedTerm` → `prohibited_term`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `term` | `String @unique @db.VarChar(100)` | Gravado já normalizado: minúsculo e sem acento |
| `administratorId` | `Int?`, FK `User` | |
| `createdAt` / `updatedAt` | padrão | |

A validação do RNF07 normaliza o texto do usuário da mesma forma antes de
comparar. Links e URLs são bloqueados por regex, sem depender desta tabela.

### `Suggestion` → `suggestion`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `type` | `SuggestionType` | |
| `text` | `String @db.VarChar(200)` | Passa pela validação do RNF07 |
| `status` | `SuggestionStatus @default(PENDING)` | |
| `requesterId` | `Int`, FK `User` | Quem sugeriu |
| `reviewerId` | `Int?`, FK `User` | Administrador que decidiu |
| `reviewedAt` | `DateTime?` | |
| `createdAt` / `updatedAt` | padrão | |

Aprovar cria a opção na lista correspondente, na mesma transação que muda o
status. A sugestão não guarda a opção criada.

### `OrderReminder` → `order_reminder`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `orderId` | `Int`, FK `Order`, `onDelete: Cascade` | |
| `kind` | `OrderReminderKind` | |
| `sentAt` | `DateTime @default(now())` | |
| | `@@unique([orderId, kind])` | RN42: cada lembrete sai no máximo uma vez. A tarefa pode rodar de novo sem duplicar |

A linha só é gravada depois que o webhook do n8n responde com sucesso. Se
ele falhar, a próxima execução tenta de novo.

### `AuditLog` → `audit_log`

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `administratorId` | `Int?`, FK `User`, `onDelete: SetNull` | Ver nota abaixo |
| `action` | `String @db.VarChar(50)` | Formato `recurso.ação`, ex.: `food.approve`, `order.delete`, `category.update` |
| `entityType` | `String @db.VarChar(50)` | ex.: `Food` |
| `entityId` | `String @db.VarChar(50)` | Texto, para aceitar qualquer id |
| `details` | `Json?` | Dados relevantes da ação (ex.: campos alterados). Nunca senha |
| `createdAt` | `DateTime @default(now())` | |

Nota: a exclusão permanente de um administrador (RF31) não pode apagar a
auditoria dele. Por isso `administratorId` é `Int?` com
`onDelete: SetNull`, e o nome e o e-mail do administrador vão também em
`details` no momento da ação.

### `AccessLog` → `access_log`

Decisão DT19. Uma linha por requisição atendida pela API (RNF13).

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | `Int @id @default(autoincrement())` | |
| `userId` | `Int?`, FK `User`, `onDelete: SetNull` | Usuário autenticado, quando houver (inclusive no login e no logout) |
| `method` | `String @db.VarChar(10)` | |
| `path` | `String @db.VarChar(500)` | Sem a query string |
| `statusCode` | `Int` | |
| `durationMs` | `Int` | |
| `ipAddress` | `String? @db.VarChar(45)` | IP do cliente (o Express confia em um salto de proxy, o Traefik) |
| `userAgent` | `String? @db.VarChar(500)` | |
| `createdAt` | `DateTime @default(now())` | |

Índices: `@@index([createdAt])` e `@@index([userId])`.

- Ficam de fora: `OPTIONS`, `/health`, `/docs`, `/openapi` e o favicon.
- Nunca guarda corpo, cookie, cabeçalho de autenticação nem query string.
- A gravação é feita depois da resposta, sem atrasá-la; falha só gera log de erro.
- Retenção: ainda não definida (`docs/PENDENCIAS.md`).

## Imagens (MinIO)

- O banco guarda a **chave do objeto** (ex.: `foods/3f2a…c1.webp`,
  `users/9b1e…7a.png`), nunca uma URL completa. Assim, trocar domínio ou
  bucket não exige migração de dados.
- O MinIO do staging não tem domínio público (`docs/INFRAESTRUTURA.md`),
  então o navegador não consegue buscar a imagem direto nele. O backend
  expõe uma rota que lê o objeto pela rede interna e devolve o arquivo:
  `GET /files/*key`, com cache HTTP. As respostas da API montam a URL a
  partir da chave.
- Limites de upload: RN41.
- Excluir permanentemente um alimento, usuário ou instituição (RF31, RF45,
  RF46, RF51) apaga também o objeto no MinIO, **depois** do commit da
  transação no banco.

## Recuperação de senha (DT03, DT17)

- **Sem tabela nova.** O plugin `emailOTP` grava o código em `verification`.
- Configuração do plugin: `otpLength: 6`, `expiresIn: 600` (RN33).
- **Limite de solicitações (RNF11):** só configuração nativa do better-auth,
  sem código em volta da rota:

  ```ts
  rateLimit: {
    customRules: {
      '/email-otp/request-password-reset': { window: 600, max: 1 },
    },
  },
  ```

  - O rate limit do better-auth vem desligado fora de produção. Para testar
    em dev, ligar com `rateLimit.enabled: true`.
  - O armazenamento padrão é em memória e zera a cada redeploy. Para este
    caso, isso é aceitável.
  - O plugin ainda tem a rota antiga `/forget-password/email-otp`
    (deprecada). Ou ela recebe a mesma regra, ou fica desabilitada. O
    frontend usa só a rota nova.
- O envio usa o Resend (DT04), e o `sendVerificationOTP` não fica esperando o
  envio terminar (recomendação da doc do plugin contra timing attack).

## Unicidade entre estabelecimento e entidade (RN26)

`institutionalEmail`, `institutionalPhone` e `cnpj` são `@unique` **em
cada tabela**. Isso não impede o mesmo CNPJ num estabelecimento e numa
entidade. A checagem entre as duas tabelas fica no service, dentro da
transação do cadastro e da edição (como o MVP já faz no cadastro).
`User.email` e `User.personalPhone` já são únicos globalmente.

## Exclusões permanentes (RF31, RF45, RF46, RF51, RF54)

As relações não têm cascade (exceto as do better-auth e `OrderReminder`).
Cada exclusão permanente apaga os dependentes explicitamente, em uma
transação, nesta ordem:

- **Estabelecimento:** lembretes e pedidos dos alimentos → alimentos →
  pedidos restantes → estabelecimento → endereço → sessões e contas → usuário.
- **Entidade:** pedidos → entidade → endereço → sessões e contas → usuário.
  Nas regras de estoque, um pedido `Em andamento` apagado **não** devolve
  quantidade: o estoque já saiu do alimento.
- **Alimento:** pedidos → alimento.

## Seed

`prisma/seed.ts` continua idempotente (`upsert` por nome) e passa a criar,
nesta ordem:

1. Papéis (`Establishment`, `BeneficiaryEntity`, `Administrator`).
2. Status de alimento e de pedido (acima).
3. Categorias (as 8 do MVP).
4. Unidades de medida (tabela acima).
5. Motivos de cancelamento (de sistema e comuns).
6. Termos proibidos: lista inicial curta, validada pela dupla.
7. Catálogo de alimentos: lido de `prisma/seed-data/food-catalog.ts`, gerado
   pela curadoria da TACO (DT12), cada item com a categoria dele.
8. **Primeiro administrador**, a partir de `SEED_ADMIN_NAME`,
   `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`. É criado pela API do
   better-auth (para o hash da senha sair igual ao do login), só se ainda
   não existe nenhum usuário com papel `Administrator`. Sem as variáveis,
   este passo é pulado com um aviso.

## Migração a partir do MVP

Decisão P02: os dados do MVP são de teste. A migração **não converte
dados**; o banco de cada ambiente é recriado (local: `prisma migrate
reset`; staging: limpar o banco no Coolify e deixar o deploy rodar
`migrate deploy` + seed).

- As mudanças de schema continuam entrando por migrations normais, uma por
  change, na ordem do plano. Nada de editar migrations antigas.
- Como `OrderStatus` e `FoodStatus` são tabelas de domínio, a troca dos
  nomes de status é só de seed e de código. O seed passa a criar os nomes
  novos, e a limpeza do banco remove os antigos (`Aceito`, `Recebido`).

## Mapeamento para o documento do TCC

| Documento do TCC | Schema |
| ---------------- | ------ |
| Papel | `Role` |
| Usuario | `User` (+ `Account`, onde fica a senha) |
| Estabelecimento | `Establishment` |
| EntidadeBeneficiaria | `BeneficiaryEntity` |
| Endereco | `Address` |
| Alimento | `Food` |
| Categoria | `Category` |
| Pedido | `Order` |
| MotivoCancelamento | `CancellationReason` |
| StatusAlimento | `FoodStatus` |
| StatusPedido | `OrderStatus` |
| ItemCatalogo | `FoodCatalogItem` |
| UnidadeMedida | `MeasurementUnit` |
| TermoProibido | `ProhibitedTerm` |
| Sugestao | `Suggestion` |
| LembretePedido | `OrderReminder` |
| RegistroAuditoria | `AuditLog` |
| RegistroAcesso | `AccessLog` |
| CodigoVerificacao | não existe; `verification` do better-auth |
