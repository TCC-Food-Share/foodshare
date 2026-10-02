## Why

Hoje não existe forma de autenticar na plataforma: estabelecimentos e entidades beneficiárias se cadastram (RF01/RF03), mas não há login. Sem sessão autenticada, nenhum fluxo que depende de "quem está logado" funciona — inclusive a edição do próprio cadastro (RF05) e, mais adiante, pedidos e doações. RF07 resolve essa lacuna com login por e-mail e senha para estabelecimentos, entidades beneficiárias e administradores.

## What Changes

- Login por e-mail e senha usando [better-auth](https://better-auth.com) como mecanismo de autenticação e sessão, via seu adapter Prisma apontado diretamente para a tabela `User` já existente (sem tabela de usuário duplicada — ver design.md para a análise completa).
- Endpoint de login (`POST /api/auth/sign-in/email`, rota nativa do better-auth) que aceita e-mail e senha e, em caso de sucesso, emite uma sessão (cookie) usável nas próximas requisições.
- Guard de autenticação reutilizável para o resto da API (`@thallesp/nestjs-better-auth`), com rotas protegidas por padrão e liberação explícita onde necessário — desbloqueia o endpoint de edição de cadastro (RF05, hoje pausado à espera disso).
- Documentação da API unificada: o schema OpenAPI que o better-auth gera para suas próprias rotas é mesclado no mesmo documento Scalar (`/docs`) que já documenta o resto da API — uma página só, não duas.
- A senha definida no cadastro (RF01/RF03) passa a ser a credencial usada no login: nenhuma re-configuração de senha é exigida do estabelecimento/entidade beneficiária.
- Mudança de implementação (sem mudar o contrato observável) no fluxo de cadastro: a criação de `User` deixa de fazer hash de senha diretamente e passa a provisionar a credencial via better-auth; endereço e estabelecimento/entidade continuam sendo criados de forma atômica em seguida, com compensação (remoção do usuário) se essa segunda etapa falhar. Detalhado em design.md.
- Fora do escopo deste change: bloquear login com credenciais erradas ou conta excluída logicamente (RF08, change separado que estende esta mesma capability), logout (RF09, change separado), verificação de e-mail, recuperação de senha, 2FA, cadastro de administrador (contas de administrador são provisionadas fora da aplicação, ex. seed/manual).

## Capabilities

### New Capabilities
- `auth/login`: permite que estabelecimentos, entidades beneficiárias e administradores autentiquem com e-mail e senha e recebam uma sessão válida.

### Modified Capabilities
- (nenhuma — o contrato observável de `estabelecimentos/cadastro` e `entidades-beneficiarias/cadastro` não muda: a senha continua sendo armazenada como hash e nunca é devolvida pela API, e a criação continua sendo tudo-ou-nada. Só a implementação interna muda, documentada em design.md.)

## Impact

- Backend: nova dependência `better-auth` (+ adapter Prisma) e `@thallesp/nestjs-better-auth` para o guard/decorator do NestJS; novo módulo `auth/` com a instância do better-auth, endpoint(s) de login e configuração de sessão.
- Banco de dados: novas tabelas geradas pelo better-auth (`session`, `account`, `verification`, já em inglês, sem remapeamento). `User` já satisfaz o modelo de usuário do better-auth sem precisar de nenhum campo remapeado — ver design.md.
- Backend (código já existente): `establishments.service.ts` e `beneficiary-entities.service.ts` mudam a etapa de criação de `User` para passar pelo better-auth em vez de hash direto com `bcryptjs`.
- Frontend: tela de login (fora do escopo detalhar aqui — frontend ainda é um scaffold vazio; o contrato do endpoint é o que este change define).
