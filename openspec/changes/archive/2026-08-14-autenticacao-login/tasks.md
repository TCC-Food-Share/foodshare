## 1. Dependências e schema

- [x] 1.1 Adicionar `better-auth`, `@thallesp/nestjs-better-auth` e o pacote de CLI do better-auth às dependências de `backend/`
- [x] 1.2 Schema em inglês desde o início (`User`, `Address`, `Establishment`, `BeneficiaryEntity`, etc.) — decisão tomada durante a implementação, revisando a proposta original de manter só as tabelas do better-auth em inglês
- [x] 1.3 Rodar `prisma migrate dev` para o schema final (banco recriado do zero, sem dado de produção a preservar nesse estágio)
- [x] 1.4 Criar `backend/src/auth/auth.instance.ts` com `betterAuth({...})`: `prismaAdapter(prisma, { provider: "postgresql" })`, `user: { additionalFields: { roleId: { type: "number", required: true }, personalPhone: { type: "string", required: true } } }` (sem remapear `name`/`email`/`image`/`createdAt`/`updatedAt` — já batem com o padrão do better-auth), `advanced.database.generateId: "serial"`, `emailAndPassword: { enabled: true, requireEmailVerification: false, autoSignIn: false }`, `plugins: [openAPI({ disableDefaultReference: true })]`
- [x] 1.5 Gerar (via CLI do better-auth) e revisar o diff das tabelas `session`, `account`, `verification` no `schema.prisma`; aplicar migration garantindo `onDelete: Cascade` de `session`/`account` para `user` — CLI gerou `userId String` nas duas tabelas (não sabe do `generateId` customizado); corrigido manualmente pra `Int` antes de migrar
- [x] 1.6 Criar `backend/src/auth/auth.module.ts` importando `AuthModule.forRoot({ auth })` de `@thallesp/nestjs-better-auth` e registrar no `app.module.ts` — `main.ts` também precisou de `bodyParser: false` + `app.use(express.json())` (não previsto originalmente na task, exigido pela integração)

## 2. Cadastro passa a provisionar credencial via better-auth

- [x] 2.1 Em `establishments.service.ts`, trocar a criação de `User` dentro da `$transaction` por: chamar `auth.api.signUpEmail` com `name`, `email`, `password`, `personalPhone` e `roleId` resolvido para `Establishment`, fora da transação; em seguida, uma transação criando `Address` e `Establishment` com o `userId` retornado
- [x] 2.2 Se a criação de `Address`/`Establishment` falhar, remover o `User` recém-criado como compensação (via Prisma) antes de propagar o erro
- [x] 2.3 Remover o hashing manual com `bcryptjs` (não usado mais) — pacote `bcryptjs`/`@types/bcryptjs` desinstalado
- [x] 2.4 Repetir 2.1–2.3 em `beneficiary-entities.service.ts`
- [x] 2.5 Confirmar que a checagem de unicidade prévia (RF02/RF04, `checkUniqueness`) continua rodando antes de chamar `signUpEmail`, sem duplicar a checagem de e-mail que o better-auth já faz internamente
- [x] 2.6 `BETTER_AUTH` como token de DI (não singleton importado direto) nos dois serviços — necessário pra poder mockar em teste unitário, mesmo padrão já usado pra `PrismaService` (não previsto originalmente na task)

## 3. Endpoint de login

- [x] 3.1 Confirmar que o better-auth expõe `POST /api/auth/sign-in/email` (rota nativa do plugin de e-mail/senha) através do `AuthModule`
- [x] 3.2 Validar que a resposta de login não inclui a senha/hash em nenhum campo — confirmado via smoke test real (curl)
- [x] 3.3 Validar que campos obrigatórios ausentes (e-mail ou senha) são rejeitados sem emitir sessão — confirmado via curl: `400 VALIDATION_ERROR` pros dois casos, sem sessão. Bônus verificado: e-mail inexistente e senha errada retornam o mesmo `401 INVALID_EMAIL_OR_PASSWORD` — o anti-enumeração que o RF08 vai precisar já vem de fábrica do better-auth
- [x] 3.4 Documentação unificada: `auth.api.generateOpenAPISchema()` buscado no boot (`main.ts`), paths reescritos com o prefixo `/api/auth` e mesclado no documento que o `@nestjs/swagger` gera pros controllers próprios — uma página Scalar (`/docs`) só, cobrindo tudo. Página default do plugin (`/api/auth/reference`) desativada (`disableDefaultReference: true`)

## 4. Guard reutilizável

- [x] 4.1 Confirmar que o `AuthGuard` global do `@thallesp/nestjs-better-auth` está ativo (rotas protegidas por padrão)
- [x] 4.2 Marcar os endpoints públicos existentes (`POST /establishments`, `POST /beneficiary-entities`) com `@AllowAnonymous()` — `GET /` (rota raiz pré-existente) também precisou
- [x] 4.3 Confirmar que um endpoint protegido de teste (`GET /me`, retorna `@Session()`) nega acesso sem sessão e permite acesso com sessão válida — confirmado via curl: sem cookie → 401; cadastro real → login real → com cookie de sessão → 200 com os dados do usuário

## 5. Testes

- [x] 5.1 Teste unitário: falha na criação de endereço/estabelecimento após `signUpEmail` bem-sucedido remove o usuário órfão (compensação) — `establishments.service.spec.ts`/`beneficiary-entities.service.spec.ts`, cobrindo erro genérico e P2002
- [x] 5.2 Teste unitário: `user.id` (string, retornado pelo better-auth) é convertido com `Number(...)` antes de virar `userId` no registro criado — mesmos arquivos
- [x] 5.3 Fluxo completo (cadastro real → login real → `GET /me` com sessão; e-mail/senha ausentes; e-mail inexistente e senha errada retornando o mesmo erro) validado manualmente via curl contra um servidor real durante a implementação — não há teste automatizado cobrindo esse fluxo ponta a ponta: o projeto usa só testes unitários (decisão de simplificação), e o better-auth real não é exercitado em nenhum teste

### Nota sobre testes e o better-auth (ESM-only)

`better-auth`/`@thallesp/nestjs-better-auth` são ESM-only (`"type": "module"`, sem build CJS, usam `import.meta`) e não carregam sob o `ts-jest` do projeto (CJS) — qualquer teste que os importasse de verdade quebraria com `SyntaxError`. Como a suíte é só unitária, isso nunca chega a ser um problema: todo teste que toca `EstablishmentsService`/`BeneficiaryEntitiesService`/`AppController` mocka o módulo `auth.instance` (ou sobrescreve o token `BETTER_AUTH` via DI) em vez de carregar o pacote real.
