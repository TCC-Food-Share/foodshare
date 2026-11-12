## Why

Hoje quem esquece a senha não tem saída: não há rota nem tela de recuperação, e o administrador não troca senha
de ninguém. O RF08 pede a recuperação por código enviado ao e-mail pessoal, e a RN33, o RNF11 e o RNF12 definem o
código (6 dígitos, 10 minutos, uso único), o limite de 1 pedido a cada 10 minutos por IP e o envio pelo Resend.
É o item 4.1 do plano e só depende da 0.1.

A dupla decidiu incluir nesta mesma change a **confirmação do e-mail no cadastro** (RF75, novo). Hoje qualquer
e-mail digitado vira conta, inclusive com erro de digitação, e a recuperação de senha só funciona se o e-mail for
real. As duas funções usam o mesmo plugin, o mesmo envio pelo Resend e a mesma tela de código.

## What Changes

### Recuperação de senha (RF08)

- **Backend (sem wrapper, DT03 e DT17):**
  - liga o plugin `emailOTP` do better-auth com `otpLength: 6`, `expiresIn: 600` e `allowedAttempts: 3` (RN33);
  - usa as rotas nativas `POST /auth/email-otp/request-password-reset`,
    `POST /auth/email-otp/check-verification-otp` (tela do código) e `POST /auth/email-otp/reset-password`;
  - desabilita as rotas do plugin que não são usadas, inclusive login por código (`/sign-in/email-otp`), a rota
    deprecada `/forget-password/email-otp` e `/email-otp/send-verification-otp`, que também gera código de
    recuperação e escaparia do limite;
  - limite nativo `rateLimit.customRules`: `'/email-otp/request-password-reset': { window: 600, max: 1 }` (RNF11);
  - o envio pelo Resend (DT04, RNF12) não espera o e-mail sair e **não envia** para conta excluída logicamente;
  - `revokeSessionsOnPasswordReset: true`: redefinir a senha encerra todas as sessões da conta;
  - CORS passa a expor o header `X-Retry-After` para o frontend saber quanto falta para pedir outro código.
- **Frontend:** link "Esqueci minha senha" no login e as três telas do protótipo em `/esqueci-senha` (e-mail →
  código → nova senha), com volta ao login e aviso de sucesso.

### Confirmação do e-mail no cadastro (RF75, novo)

- **Backend (sem wrapper):**
  - `requireEmailVerification: true`: conta com e-mail não confirmado não faz login;
  - o cadastro envia um código de 6 dígitos ao e-mail pessoal, pelo mesmo plugin (`overrideDefaultEmailVerification`),
    com as mesmas regras da recuperação: 10 minutos, 3 tentativas;
  - rotas nativas: `POST /auth/email-otp/verify-email` (confirma) e `POST /auth/send-verification-email`
    (reenvia), esta com o mesmo limite de 1 pedido a cada 10 minutos por IP;
  - o administrador criado pelo seed nasce confirmado e não recebe e-mail;
  - migration: `User.emailVerified` passa a ter padrão `false`;
  - **tarefa agendada nova, de hora em hora:** apaga de vez as contas não confirmadas criadas há mais de 24 horas
    (usuário, instituição, endereço, sessões, códigos e a imagem no MinIO). Libera CNPJ, e-mails e celulares para
    um novo cadastro. Também pode ser rodada pela rota de administrador `POST /admin/jobs/:name/run`.
- **Frontend:**
  - o cadastro termina na tela "Confirme seu e-mail" (código de 6 dígitos, reenviar, voltar ao login), em vez de
    ir direto ao login;
  - o login de conta não confirmada leva à mesma tela, com o e-mail preenchido;
  - confirmado o e-mail, volta ao login com aviso de sucesso.

### Documentação

- `docs/REQUISITOS.md`:
  - RF75 novo;
  - RN45 revisada (dois e-mails: recuperação e confirmação);
  - RN47 e RN48 novas (confirmação obrigatória e exclusão em 24 horas);
  - DT36 a DT39;
  - escopo atualizado.
- `docs/MODELO-DE-DADOS.md`, `docs/INFRAESTRUTURA.md` e o item 4.1 do `docs/PLANO-IMPLEMENTACAO.md` (que passa a
  cobrir o RF75), marcado ✅ ao fim.

**Decisões tomadas com a dupla antes da proposta:**

- **DT36:** na recuperação, e-mail não cadastrado recebe a mesma resposta de sucesso e a tela segue para o código
  ("Se o e-mail estiver cadastrado, enviamos um código"). Nada é enviado. Conta excluída logicamente é tratada
  igual. Vale também para o reenvio do código de confirmação.
- **DT37:** 3 tentativas erradas invalidam o código (recuperação e confirmação). Para tentar de novo, a pessoa pede
  outro código, sujeito ao limite de 10 minutos.
- **DT38:** redefinir a senha encerra todas as sessões abertas da conta.
- **DT39:** confirmação por código de 6 dígitos, não por link. Toda conta nova exige confirmação antes do primeiro
  login, inclusive as que o administrador criar (RF29, RF41, changes 5.1 e 5.2). A única exceção é o administrador
  criado pelo seed. Conta não confirmada em 24 horas é apagada de vez (RN48).
- Os bancos local e de staging serão resetados pela dupla, então não há conversão de contas existentes.

**Consequência registrada:** redefinir a senha pelo código também confirma o e-mail (comportamento nativo do
plugin). Faz sentido: o código prova que a pessoa tem acesso ao e-mail. Uma conta não confirmada que redefine a
senha deixa de ser apagada pela tarefa.

**Divergência do protótipo:** o subtítulo da tela "Crie uma nova senha" diz "Sua nova senha deve ser diferente das
senhas usadas anteriormente". O sistema não guarda histórico de senhas e nenhum RF pede isso; o texto vira a regra
real ("Use de 8 a 72 caracteres."). O protótipo não tem tela de confirmação de e-mail. A tela nova reaproveita o
layout de "Verifique seu e-mail" da recuperação.

**Cobre:** RF08, RF75 (novo), RNF11, RNF12, RN33, RN45 (revisada), RN47 e RN48 (novas), DT03, DT04, DT17 e DT36 a
DT39.

**Fica de fora (outras changes do plano ou fora do escopo):**

- troca de senha logado, na tela de perfil (nenhum RF; o perfil é a 4.2 e não inclui senha);
- troca do e-mail pessoal com nova confirmação (o e-mail pessoal continua somente leitura, 4.2);
- qualquer outro e-mail: boas-vindas, aviso de senha alterada, notificação de pedido (RN45, fora do escopo);
- telas e rotas do administrador que criam contas (5.1 e 5.2). Elas herdam a confirmação obrigatória da DT39 sem
  código extra, porque o envio sai do próprio cadastro do better-auth;
- tarefa diária das 08:00 (expiração e lembretes, 6.1 e 6.2). Esta change só instala o agendador e cria a tarefa
  de hora em hora;
- armazenamento do rate limit em banco ou Redis: fica em memória e zera a cada redeploy (aceito em
  `docs/MODELO-DE-DADOS.md`).

**Perguntas em aberto:** nenhuma. As oito que surgiram foram respondidas pela dupla:
- e-mail não cadastrado, conta excluída, tentativas e sessões viraram as DT36 a DT38;
- login antes de confirmar, formato do código, contas fora do cadastro público e conta não confirmada viraram a
  DT39 e as RN47 e RN48.

## Capabilities

### New Capabilities

- `auth/recuperacao-senha`: pedido do código por e-mail com limite por IP, validação do código, definição da nova
  senha, efeitos (código descartado, sessões encerradas) e as três telas do fluxo com o link no login.
- `auth/confirmacao-email`: código de confirmação enviado no cadastro, confirmação, reenvio com limite, exclusão
  das contas não confirmadas em 24 horas e a tela "Confirme seu e-mail".

### Modified Capabilities

- `auth/login`: a credencial do cadastro só vale depois da confirmação do e-mail. Requisito novo de bloqueio do
  login de conta não confirmada, que leva à tela de confirmação.
- `estabelecimentos/cadastro`: a conta nasce não confirmada e recebe o código; ao terminar, o formulário leva à tela
  de confirmação em vez do login.
- `entidades-beneficiarias/cadastro`: igual ao estabelecimento.

## Impact

- **Backend:**
  - `auth/auth.instance.ts` (plugin `emailOTP`, `emailVerification`, `requireEmailVerification`, `rateLimit`,
    `revokeSessionsOnPasswordReset`, `maxPasswordLength: 72`, rotas desabilitadas e liberadas);
  - módulo de e-mail novo (`mail/`), com o cliente do Resend e os dois textos em pt-BR;
  - `jobs/`: `@nestjs/schedule` (dependência nova) e a tarefa de limpeza das contas não confirmadas;
  - `prisma/schema.prisma` + migration (`emailVerified` com padrão `false`) e `prisma/seed.ts` (admin confirmado,
    sem e-mail);
  - `main.ts` (`exposedHeaders: ['X-Retry-After']` e resumos do Scalar);
  - dependências novas: `resend`, `@nestjs/schedule`;
  - `.env.example`: `RESEND_API_KEY` e `EMAIL_FROM`.
- **API:**
  - rotas nativas novas sob `/auth/email-otp/*` e `/auth/send-verification-email`;
  - `POST /auth/sign-in/email` passa a responder `403` com `code: EMAIL_NOT_VERIFIED` para conta não confirmada;
  - `POST /establishments` e `/beneficiary-entities` não mudam de contrato, mas passam a enviar o código.
- **Frontend:**
  - `features/auth/login-page.tsx` (link, avisos e desvio para a confirmação);
  - `features/auth/forgot-password/` e `features/auth/confirm-email/` novos, com um componente de código
    compartilhado;
  - `features/auth/sign-up/sign-up-page.tsx` (fim do cadastro leva à confirmação);
  - `app/router.tsx` (rotas públicas `/esqueci-senha` e `/confirmar-email`);
  - `lib/api.ts`: `ApiError` passa a guardar o `X-Retry-After`;
  - componente `input-otp` do shadcn (dependência nova).
- **Infra:**
  - `RESEND_API_KEY` e `EMAIL_FROM` no Coolify do staging;
  - conferir que o better-auth enxerga o IP real atrás do Traefik (sem isso, o limite vira um balde único);
  - mais consumo da cota do Resend: um e-mail por cadastro.
- **Dados:** reset dos bancos local e de staging pela dupla, depois da migration.
