## Context

`User` já é, na prática, a identidade de autenticação do sistema: `email` único, `personalPhone` único, mais o papel (`roleId`) e a relação opcional 1:1 com `Establishment`/`BeneficiaryEntity`. O cadastro (RF01/RF03) já cria esses registros hoje; RF02/RF04 já garantem unicidade de e-mail/CNPJ/celular no cadastro; RF06 (fora deste change) vai travar a edição do e-mail pessoal, CNPJ e razão social depois do cadastro.

O schema todo (tabelas e campos) está em inglês — decisão tomada durante a implementação deste change, revisando a decisão original de manter só as tabelas do better-auth em inglês e o resto do domínio em português. Isso simplificou bastante a integração: como o modelo `User` já usa exatamente o vocabulário padrão do better-auth (`name`, `email`, `image`, `createdAt`, `updatedAt`), não é preciso remapear nenhum campo — só `additionalFields` para o que é exclusivamente nosso (`roleId`, `personalPhone`).

## Goals / Non-Goals

**Goals:**
- Escolher e justificar como o better-auth se encaixa no schema Prisma existente, sem duplicar identidade (e-mail, nome) entre tabelas.
- Definir o endpoint de login, o formato da sessão e como o restante da API vai ler "quem está autenticado" (desbloqueando o guard que RF05 está esperando).
- Preservar o contrato observável já mesclado de `estabelecimentos/cadastro` e `entidades-beneficiarias/cadastro` (senha vira hash, nunca é devolvida, criação é tudo-ou-nada) trocando só o mecanismo por baixo.
- Uma única página de documentação da API (Scalar), cobrindo tanto os endpoints próprios quanto os do better-auth.

**Non-Goals:**
- Bloquear login com credencial errada ou conta excluída logicamente — é o RF08, change separado que estende esta mesma capability (`auth/login`).
- Logout — é o RF09, change separado (`auth/logout`).
- Verificação de e-mail, recuperação de senha, 2FA, múltiplos provedores (Google, etc.) — fora do escopo do MVP.
- Cadastro de administrador — contas de administrador são provisionadas fora da aplicação (seed/manual); este change só cobre o login de uma conta de administrador já existente no banco.

## Decisions

**Better-auth aponta direto para a tabela `User` existente, em vez de criar uma tabela `user` separada.**
O adapter Prisma do better-auth aceita remapear nome de modelo e de campos (`user: { modelName, fields }`), mas como o schema já usa `User`/`name`/`email`/`image`/`createdAt`/`updatedAt` (o vocabulário padrão do próprio better-auth), nenhum remapeamento é necessário — só `modelName` seria preciso se o nome da tabela divergisse, e não diverge. Preserva o `id Int @default(autoincrement())` do `User` em vez do id string padrão do better-auth (ver decisão de `generateId` abaixo).

`roleId` e `personalPhone` (campos nossos, fora do vocabulário do better-auth) são passados como `additionalFields` obrigatórios no momento do signup.

Alternativa considerada — tabelas `user`/`session`/`account`/`verification` totalmente separadas, ligadas via um campo de referência externo: mais simples de configurar (zero mapeamento), mas duplica `email`/`name` entre duas tabelas e deixaria uma segunda cópia de credencial morta na tabela de domínio. Descartada por criar duas fontes de verdade para o mesmo dado sem necessidade.

**Geração de id: `advanced.database.generateId: "serial"`.**
Essa opção é **global** (não por modelo, apesar do nome sugerir granularidade) — delega ao Postgres a geração do id de `User` (mantendo `Int` autoincrement) e faz o better-auth converter string↔número ao linkar `Account`/`Session` a um usuário. Efeito colateral: como é global, `Session`/`Account`/`Verification` também deixam de ganhar id gerado pelo better-auth — por isso essas três tabelas têm `@default(uuid())` no Prisma (gerado pelo Prisma Client, sem alterar a coluna no banco — confirmado gerando uma migration, que saiu vazia) pra continuar preenchendo o `id` quando o better-auth omite.

Duas armadilhas encontradas só testando de verdade (não estavam nítidas na doc):
- Uma primeira tentativa com `generateId: (options) => options.model === "user" ? false : crypto.randomUUID()` (callback por modelo) criava o `User` certo, mas o `linkAccount` interno do better-auth manda o id do usuário como *string* incondicionalmente pro `Account.userId` — que é `Int` — e quebra com `PrismaClientValidationError`, depois de já ter criado o `User` (usuário órfão, sem account). O `generateId: "serial"` resolve isso porque o better-auth sabe fazer a conversão de tipo nesse caso específico.
- `user.id` no objeto retornado por `signUpEmail` continua vindo como **string** (`"10"`, não `10`) mesmo com `serial` — é assim que o better-auth tipa/serializa id na API pública dele, independente do tipo real no banco. Código que usa esse retorno precisa converter explicitamente (`Number(user.id)`), um cast de TypeScript sozinho (`as unknown as number`) não muda o valor em runtime.

**Senha vive só na tabela `account` do better-auth (provider `credential`), nunca em `User`.**
O modelo `User` nunca teve (e não ganha) uma coluna de senha própria — evita duas cópias de credencial.

**Cadastro (RF01/RF03) passa a criar o usuário via `auth.api.signUpEmail`, com uma segunda etapa compensada para endereço + estabelecimento/entidade.**
Hoje `establishments.service.ts`/`beneficiary-entities.service.ts` criam `User`, `Address` e `Establishment`/`BeneficiaryEntity` numa única `prisma.$transaction`. O better-auth gerencia sua própria criação de usuário internamente (via `signUpEmail`), fora do controle direto de uma transação Prisma manual seguindo o mesmo padrão — então o fluxo passa a ser:
1. `auth.api.signUpEmail({ body: { name, email, password, roleId, personalPhone } })` cria `User` (com `roleId`/`personalPhone` via `additionalFields`) + a credencial em `account`.
2. Em seguida, uma transação Prisma normal cria `Address` e `Establishment`/`BeneficiaryEntity` referenciando o `userId` retornado.
3. Se o passo 2 falhar, o serviço apaga o `User` criado no passo 1 como compensação, direto via Prisma (`onDelete: Cascade` nas tabelas `session`/`account` do better-auth garante que não fica órfão).

O contrato observável de RF01/RF03 (tudo ou nada; senha nunca em texto puro; senha nunca devolvida pela API) continua valendo — por isso não há delta nas specs de `estabelecimentos/cadastro`/`entidades-beneficiarias/cadastro`, só mudança de implementação.
Alternativa considerada: manter a criação de `User` direto via Prisma (como hoje) e só criar a linha em `account` separadamente com hash compatível — descartada porque duplicaria a lógica de hashing/validação de senha que o better-auth já resolve.

**Guard e leitura de sessão via `@thallesp/nestjs-better-auth`.**
Pacote da comunidade que registra um `AuthGuard` global no NestJS (rotas protegidas por padrão, liberadas com `@AllowAnonymous()`/`@OptionalAuth()`) e expõe `@Session()` para ler o usuário autenticado — dispensa escrever guard/decorator manualmente. É a peça que faltava para o RF05 (edição de cadastro, hoje pausado à espera de autenticação).
Alternativa considerada: consumir a API HTTP do better-auth manualmente num guard próprio (`auth.api.getSession({ headers })`) sem o pacote NestJS — mais controle, mas reimplementa algo que o pacote já resolve; descartada por custo sem benefício claro no tamanho deste projeto.

**Documentação unificada: o schema OpenAPI do better-auth é mesclado no documento Scalar principal.**
`auth.api.generateOpenAPISchema()` (habilitado pelo plugin `openAPI()` do better-auth) retorna um documento OpenAPI 3.1 só com as rotas do better-auth, com paths relativos ao path interno dele (`/sign-in/email`, não `/api/auth/sign-in/email`). Em `main.ts`, esse schema é buscado no boot, os paths são reescritos com o prefixo `/api/auth` (o mount real, adicionado pelo `@thallesp/nestjs-better-auth`), e o resultado é mesclado (`paths`/`components`) no documento que o `@nestjs/swagger` já gera pros controllers próprios — uma página Scalar só, em vez de duas. A página de referência default do plugin (`/api/auth/reference`) fica desativada (`disableDefaultReference: true`) pra não ficar uma segunda página redundante.
Alternativa considerada: manter as duas páginas separadas (a do plugin em `/api/auth/reference`, a do Nest em `/docs`) — mais simples de implementar, mas pior experiência pra quem consome a API (tem que saber que existem duas). Descartada.

## Risks / Trade-offs

- [Falha entre a criação do usuário via better-auth e a criação de endereço/estabelecimento deixa um `User` órfão] → mitigado pela etapa de compensação (remoção do usuário) no `catch` da segunda transação; coberto por teste unitário dedicado.
- [Upgrade de versão do better-auth mudar o formato interno de `account`/`session`] → mitigado por não depender de nenhum campo dessas tabelas fora da API pública do better-auth (nunca lidas/escritas diretamente via Prisma no código da aplicação).
- [`generateId: "serial"` é global e tem efeitos colaterais não óbvios pela doc (afeta id de `session`/`account`/`verification` também, e `user.id` retornado continua string mesmo com id numérico no banco)] → mitigado empiricamente: testado ponta a ponta durante a implementação (signup real via `auth.api.signUpEmail`, inspeção direta das linhas em `user`/`account`), `@default(uuid())` cobre a lacuna de id nas 3 tabelas do better-auth, e o código sempre converte `user.id` com `Number(...)` antes de usar.
- [Dependência de um pacote de terceiros (`@thallesp/nestjs-better-auth`) para o guard do NestJS, não mantido pela própria better-auth] → aceito pelo ganho de não reimplementar guard/decorator; se o pacote ficar sem manutenção, a troca por um guard manual sobre `auth.api.getSession` é uma mudança isolada no módulo `auth/`, sem impacto nas specs.
- [`better-auth`/`@thallesp/nestjs-better-auth` são pacotes ESM-only (sem build CJS) — qualquer arquivo que os importe transitivamente quebra sob o `ts-jest` padrão do projeto] → mitigado mockando o módulo `auth.instance`/`@thallesp/nestjs-better-auth` nos testes unitários que não precisam da instância real (o token `BETTER_AUTH`, injetado via DI, é sobrescrito por um mock — mesmo padrão já usado pra `PrismaService`). O projeto não tem mais suíte e2e (removida por decisão de simplificação), então não há teste que precise carregar o pacote de verdade.

## Migration Plan

1. Schema já nasce em inglês (`User`, `Session`, `Account`, `Verification`, etc.) — sem migration incremental de rename, banco recriado do zero durante a implementação (sem dado de produção a preservar nesse estágio do projeto).
2. Rodar a geração de schema do better-auth (`npx @better-auth/cli generate` ou equivalente) apontando para o Prisma já configurado, revisando o diff antes de aplicar (deve adicionar só `session`, `account`, `verification`). A CLI gera `userId String` nessas tabelas por padrão (não sabe que `User.id` é `Int`) — corrigir manualmente pra `Int` antes de migrar, e adicionar `@default(uuid())` em `Session.id`/`Account.id`/`Verification.id` (ver decisão de `generateId` acima).
3. Atualizar `establishments.service.ts`/`beneficiary-entities.service.ts` para o fluxo de duas etapas com compensação (decisão acima).
4. Sem plano de rollback de dados em produção — projeto ainda não tem usuários reais em staging além dos de teste; rollback é reverter a migration e o código.
