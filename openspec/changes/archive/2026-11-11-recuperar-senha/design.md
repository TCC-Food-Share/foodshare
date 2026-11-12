## Context

Motivação em `proposal.md`. O comportamento está em `specs/`:
- `auth/recuperacao-senha` e `auth/confirmacao-email` (novas);
- `auth/login`, `estabelecimentos/cadastro` e `entidades-beneficiarias/cadastro` (alteradas).

O que existe hoje em `develop`:

- **`auth/auth.instance.ts`** cria a instância do better-auth (1.6.28) como módulo comum, fora da injeção do Nest.
  Só tem o plugin `openAPI`, um hook `before` que bloqueia login de conta excluída e uma lista `disabledPaths` com
  as rotas nativas que o projeto não usa. Nela estão `/request-password-reset` e `/reset-password` (recuperação por
  link, não por código) e `/send-verification-email` e `/verify-email` (confirmação por link).
  `emailAndPassword` tem `autoSignIn: false` e `requireEmailVerification: false`.
- **Cadastro:** `EstablishmentsService.create` e `BeneficiaryEntitiesService.create` chamam
  `auth.api.signUpEmail()` e depois criam endereço + instituição numa transação; se ela falha, apagam o usuário e a
  imagem. O better-auth grava `emailVerified: false` em todo cadastro, embora o `schema.prisma` tenha
  `@default(true)`.
- **Seed:** cria o primeiro administrador com `auth.api.signUpEmail()`.
- **Rate limit:** nada configurado no better-auth. O `ThrottlerModule` do Nest (`rate-limit/`) não alcança
  `/auth/*`, porque o handler do better-auth roda como middleware antes dos guards. O rate limit do better-auth vem
  ligado só com `NODE_ENV=production` e guarda os contadores em memória, por IP **e caminho**.
- **IP do cliente:** o better-auth lê `x-forwarded-for` e só aceita o valor quando ele tem **um** IP. Sem IP, cai
  num balde único compartilhado por todo mundo (loga um aviso uma vez).
- **CORS** (`main.ts`) não expõe nenhum header. No staging o front e a API ficam em subdomínios diferentes.
- **Plugin `emailOTP`** (lido no código instalado):
  - guarda o código em `verification` com o identificador `<tipo>-otp-<email>`, e pedir de novo **substitui** o
    código;
  - `otpLength`, `expiresIn` e `allowedAttempts` valem para todos os tipos;
  - `check-verification-otp` confere sem consumir e soma tentativa quando erra;
  - `reset-password` troca a senha, descarta o código, marca `emailVerified: true` e, com
    `revokeSessionsOnPasswordReset`, apaga as sessões;
  - `verify-email` (`email` + `otp`) marca `emailVerified: true` e só abre sessão com `autoSignInAfterVerification`;
  - com `overrideDefaultEmailVerification: true`, o `sendVerificationEmail` nativo passa a gerar e enviar um código
    do tipo `email-verification`, em vez de link;
  - erros vêm como `{ code, message }`: `INVALID_OTP` (400), `OTP_EXPIRED` (400) e `TOO_MANY_ATTEMPTS` (403).
- **Login nativo** com `requireEmailVerification`: confere a senha **antes** de olhar a confirmação (senha errada
  continua `401` genérico) e, para conta não confirmada, responde `403` `EMAIL_NOT_VERIFIED`. Só envia e-mail se
  `emailVerification.sendOnSignIn` estiver ligado.
- **`/send-verification-email` nativa:** sem sessão, recebe `email`; para e-mail inexistente ou já confirmado não
  envia nada e responde igual, com tempo mínimo de 500 ms.
- **Jobs:** `JobsService` é um registro de tarefas por nome, executáveis pela rota de administrador
  `POST /admin/jobs/:name/run`. `@nestjs/schedule` ainda não está instalado (`docs/INFRAESTRUTURA.md` já o prevê).
- **Frontend:**
  - `LoginPage` não tem link de recuperação e trata só `401`;
  - `SignUpPage` leva ao `/login` ao terminar;
  - `ApiError` guarda `status` e `body`, sem headers;
  - o cadastro valida senha com `min(8)`/`max(72)` e confirmação com "As senhas não conferem.".

## Goals / Non-Goals

**Goals:**

- Nenhum código nosso em volta das rotas do better-auth (CONVENCOES, DT03, DT17). Regra vira configuração ou
  callback do próprio plugin.
- Só um caminho gera cada tipo de código, e todo caminho que envia e-mail a pedido de quem não está logado passa
  pelo limite de 10 minutos.
- Tempo de resposta igual para e-mail existente, inexistente e de conta excluída.
- Recuperação e confirmação reaproveitam a mesma entrega de e-mail, o mesmo componente de código e as mesmas
  mensagens.

**Non-Goals:**

- Rate limit persistente (banco ou Redis). Aceito em `docs/MODELO-DE-DADOS.md`: zera no redeploy.
- Template de e-mail elaborado (React Email, imagens). É um texto curto com HTML simples.
- Fila ou reenvio automático quando o Resend falha.
- Teste automatizado ponta a ponta das rotas do better-auth: o projeto só tem testes de unidade (Jest). As rotas
  nativas são conferidas por `curl` e no navegador.
- Trava para várias instâncias da tarefa de limpeza: o backend roda em uma única instância por ambiente
  (`docs/INFRAESTRUTURA.md`).

## Decisions

### D1. Configuração do better-auth

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,          // RN47
  autoSignIn: false,
  revokeSessionsOnPasswordReset: true,     // DT38
  maxPasswordLength: 72,                   // igual ao cadastro (padrão do better-auth: 128)
},
emailVerification: {
  sendOnSignUp: true,
  sendOnSignIn: false,                     // login bloqueado não envia e-mail (D5)
  autoSignInAfterVerification: false,      // confirmar não abre sessão
},
plugins: [
  openAPI(...),
  emailOTP({
    otpLength: 6,
    expiresIn: 600,
    allowedAttempts: 3,                    // DT37
    disableSignUp: true,
    overrideDefaultEmailVerification: true,
    sendVerificationOTP: sendVerificationCode, // D3
  }),
],
```

- `storeOTP` fica no padrão (`plain`). O código vale 10 minutos, é de uso único e o banco não é exposto.
  Alternativa `hashed` recusada: impede o plugin de reaproveitar o código e não muda nada que a spec peça.
- **Alternativa recusada: confirmação por link** (o padrão do better-auth). Precisaria de outra tela de retorno e de
  outro texto de e-mail, e a dupla escolheu código (DT39).

### D2. Rotas abertas e fechadas

Ficam abertas (tiradas de `disabledPaths` quando estão lá):

| Rota                                    | Uso                                                       |
| --------------------------------------- | --------------------------------------------------------- |
| `/email-otp/request-password-reset`     | pedir código de recuperação                               |
| `/email-otp/check-verification-otp`     | tela do código da recuperação (confere sem consumir)      |
| `/email-otp/reset-password`             | trocar a senha                                            |
| `/email-otp/verify-email`               | confirmar o e-mail                                        |
| `/send-verification-email`              | reenviar o código de confirmação (só tipo `email-verification`, D1) |

Entram em `disabledPaths`:
- `/sign-in/email-otp`: login por código, não é RF.
- `/email-otp/send-verification-otp`: aceita qualquer `type` e geraria código de recuperação **fora** do limite,
  que é por caminho.
- `/forget-password/email-otp`: deprecada.
- `/email-otp/request-email-change` e `/email-otp/change-email`.

Continuam desabilitadas `/verify-email` (link), `/request-password-reset` e `/reset-password` (link).

**Ponto conferido no apply:** com `overrideDefaultEmailVerification`, o `sendVerificationEmail` chama a função do
endpoint `/email-otp/send-verification-otp` **diretamente**, não por HTTP. Conferir que o `disabledPaths` não
bloqueia essa chamada interna (cadastro e reenvio precisam gerar o código). Se bloquear, o plano B é tirar essa rota
do `disabledPaths` e dar a ela a mesma regra de limite (`window: 600, max: 1`). Assim ela não abre caminho sem
limite.

**Resultado (apply):** o `disabledPaths` é checado só no `onRequest` do roteador HTTP
(`api/index.mjs` do better-auth 1.6.28). A chamada interna não passa por ele, então o plano B não foi necessário.
Confirmado em tempo de execução na tarefa 4.1.

Conferir no Scalar que as rotas desabilitadas não aparecem; se aparecerem, somar ao `hiddenAuthPaths` de `main.ts`.

### D3. Envio dos códigos: `sendVerificationCode`, sem `await`

Função comum em `mail/` (a instância do better-auth não usa DI; o `Logger` do Nest funciona sem DI), criada com o
`prisma` que `auth.instance.ts` já tem:

```ts
export function createVerificationCodeSender(prisma) {
  return ({ email, otp, type }) => {
    if (type !== 'forget-password' && type !== 'email-verification') return Promise.resolve();
    void deliver(prisma, email, otp, type).catch((error) => logger.error(...));
    return Promise.resolve();
  };
}

async function deliver(prisma, email, otp, type) {
  const user = await prisma.user.findUnique({ where: { email }, select: { deleted: true } });
  if (!user || user.deleted) return;                    // DT36
  await resend.emails.send({ from: `Food Share <${EMAIL_FROM}>`, to: email, ...TEMPLATES[type](otp) });
}
```

- A checagem de `deleted` fica **dentro** do trecho sem `await`. Assim a resposta tem o mesmo tempo para conta
  ativa e excluída (recomendação da doc do plugin contra timing attack, `docs/INFRAESTRUTURA.md`).
- **Textos em pt-BR, sem link:**
  - **Recuperação:** assunto "Seu código de recuperação de senha – Food Share"; corpo com o código em destaque,
    "vale por 10 minutos" e "se não foi você, ignore este e-mail".
  - **Confirmação:** assunto "Confirme seu e-mail – Food Share"; corpo com o código, "vale por 10 minutos" e "se
    você não se cadastrou no Food Share, ignore este e-mail".
- `EMAIL_FROM` guarda **só o endereço** (`nao-responda@foodshare.com.br`). O nome exibido fica fixo no código (o
  nome do produto é sempre "Food Share"). Alternativa recusada: o remetente completo na variável, como estava no
  exemplo do `docs/INFRAESTRUTURA.md`; exigia aspas no `.env` e deixava o nome do produto configurável sem motivo.
- **Erro de envio:** o `resend` (SDK oficial) devolve `{ error }` em vez de lançar em erro de API. `deliver` trata
  os dois casos e registra `logger.error` com o tipo, sem o código.
- **Dev sem `RESEND_API_KEY`:** fora de produção, loga o código com `logger.warn` e não chama o Resend, para testar
  sem gastar cota. Em produção sem chave, registra erro e não envia.
- **Alternativa recusada:** hook `before` que interrompe o pedido para conta excluída. Seria código em volta da rota
  e deixaria a resposta mais rápida para conta excluída.

### D4. Limite de 1 pedido a cada 10 minutos por IP

```ts
rateLimit: {
  customRules: {
    '/email-otp/request-password-reset': { window: 600, max: 1 },
    '/send-verification-email': { window: 600, max: 1 },
  },
},
```

- Os dois limites são independentes (o contador é por IP e caminho). Pedir um código de recuperação não impede
  reenviar o de confirmação.
- O código enviado no cadastro não passa por essas rotas. O cadastro já tem o limite próprio de 10 por hora por
  IP (`SignupThrottle`).
- `enabled` fica no padrão (só em produção). Staging e produção rodam com `NODE_ENV=production`; conferir no
  Coolify. Para testar em dev, ligar `enabled: true` só durante o teste, sem commitar.
- As demais rotas do plugin ficam com o limite padrão dele (3 por 60 s), que já protege `check-verification-otp` e
  `verify-email` contra tentativa em massa vinda do mesmo IP.
- **IP atrás do Traefik:** conferir no staging que o log do backend **não** mostra "Rate limiting could not
  determine a client IP". Se mostrar (por exemplo, `x-forwarded-for` com mais de um IP), configurar
  `advanced.ipAddress.ipAddressHeaders` ou `trustedProxies` com o que o staging realmente manda. Sem isso, o
  limite vira um balde único e uma pessoa bloqueia todas as outras.

### D5. Login de conta não confirmada não envia e-mail

`sendOnSignIn: false`. O login responde `403` `EMAIL_NOT_VERIFIED` e o frontend leva à tela de confirmação, onde
"Reenviar código" pede um novo pela rota com limite.

- Alternativa recusada: `sendOnSignIn: true`. Cada login com a senha certa mandaria um e-mail, sem o limite de 10
  minutos (o login só tem o limite padrão de 3 a cada 10 s). Isso gastaria a cota do Resend e criaria um caminho de
  envio fora da RNF11.

### D6. Seed: administrador confirmado, sem e-mail

`signUpEmail` dispararia o código (D1). O seed passa a criar o administrador pelo contexto interno do better-auth,
mantendo o hash igual ao do login (`docs/MODELO-DE-DADOS.md`):

```ts
const ctx = await auth.$context;
const user = await ctx.internalAdapter.createUser({ name, email, emailVerified: true, roleId, ... });
await ctx.internalAdapter.linkAccount({
  userId: user.id, providerId: 'credential', accountId: String(user.id),
  password: await ctx.password.hash(password),
});
```

Conferir os nomes exatos (`createUser`, `linkAccount` ou `createAccount`) no código instalado. O seed continua
idempotente (pula se já existe administrador).

### D7. Schema: `emailVerified` com padrão `false`

Migration que troca `@default(true)` por `@default(false)` em `User.emailVerified`. O better-auth já grava `false`
no cadastro, então nada muda em tempo de execução. A troca evita que um `create` direto pelo Prisma (por exemplo,
num teste ou num seed futuro) crie conta confirmada sem querer. Sem conversão de dados: a dupla vai resetar os
bancos local e de staging.

### D7b. `Verification.id` passa a ser serial (achado no apply)

O projeto roda o better-auth com `generateId: 'serial'`, que converte todo `id` para número antes de ir ao banco.
O `Verification.id` era `String @default(uuid())`. Ao consumir um código, o better-auth apaga a linha pelo `id`, e
o UUID virava `NaN`, era descartado, e o Prisma recebia um `delete` sem `id`. Resultado: `500` em `verify-email` e
`reset-password`. Até aqui nada consumia código, por isso nunca apareceu.

Migration `verification_id_serial`: apaga os códigos pendentes (descartáveis) e troca a coluna para `SERIAL`.
`Session.id` e `Account.id` têm a mesma inconsistência, mas nenhum fluxo usado apaga ou atualiza essas tabelas pelo
`id` (sessões saem por `token` ou `userId`, a senha por `userId`), então ficam como estão. Registrado em
`docs/MODELO-DE-DADOS.md`.

### D8. Limpeza das contas não confirmadas (RN48)

- `@nestjs/schedule` **6.x** instalado (a 12 é só ESM e quebra o Nest 11 em CommonJS, inclusive no Jest), com
  `ScheduleModule.forRoot()` no **`AppModule`**, porque a doc do pacote pede uma única chamada na aplicação.
- Serviço novo `UnverifiedAccountsCleanupService` em `jobs/`, registrado no `JobsService` como
  `unverified-accounts-cleanup` (para a rota manual) e com `@Cron(CronExpression.EVERY_HOUR)`. Uma conta vive no
  máximo cerca de 25 horas sem confirmação.
- Algoritmo:
  1. Busca `User` com `emailVerified = false` e `createdAt < now - 24h`, com a imagem e o endereço da instituição.
  2. Para cada um, numa transação:
     - **trava primeiro:** `SELECT id FROM "user" WHERE id = $1 AND "emailVerified" = false FOR UPDATE` (conferir
       o nome da tabela no `@@map`). Sem linha, a conta foi confirmada no meio e a transação sai sem apagar nada
       (cenário "Confirmação durante a tarefa"). Com a linha travada, uma confirmação simultânea espera a
       transação terminar;
     - depois, apagar o que depende do usuário: instituição, endereço, `session`, `account` e as linhas de
       `verification` com identificador `email-verification-otp-<email>` e `forget-password-otp-<email>`, e por
       fim o usuário;
     - conferir no `schema.prisma` quais relações já têm `onDelete: Cascade` e apagar à mão só o que não tem;
       a ordem segue as chaves estrangeiras.
  3. Depois do commit, `storage.removeQuietly(imageKey)`, como manda `docs/MODELO-DE-DADOS.md`.
  4. Erro em uma conta é registrado no log e não para as outras. O resultado é `{ affected }`.
- Uma conta não confirmada nunca fez login, então não tem alimentos, pedidos, sugestões nem log de auditoria. Se
  uma chave estrangeira inesperada impedir a exclusão, a transação daquela conta falha, fica no log e a conta é
  tentada de novo na hora seguinte.
- Sem `AuditLog`: a RN46 trata de escrita feita por administrador, e esta é do sistema. Fica um `logger.log` com a
  quantidade apagada.

### D9. CORS e `X-Retry-After`

`app.enableCors` ganha `exposedHeaders: ['X-Retry-After']`. `ApiError` ganha `retryAfter?: number` (segundos),
lido do header quando a resposta é `429`.

### D10. Telas

- **Componente compartilhado `CodeStep`** (`features/auth/code-step.tsx`): `InputOTP` do shadcn com 6 caixas, só
  dígitos, colar funciona; botões principal (texto por parâmetro), "Reenviar código" e "Voltar para o login";
  mostra os erros do D11.
- **`/esqueci-senha`:** uma página com `step: 'email' | 'code' | 'password'` em `useState`; o e-mail e o código
  vivem só nesse estado (nunca no endereço nem no `localStorage`). Recarregar volta à etapa do e-mail. Cada etapa
  tem o próprio `useForm` + `zodResolver`, em componente separado, evitando a armadilha do botão submit de wizard.
  - **E-mail:** `z.email()`. Envia `request-password-reset` e passa para o código. Texto: "Se o e-mail estiver
    cadastrado, enviamos um código de 6 dígitos para {email}."
  - **Código:** `CodeStep` com "Verificar código" (`check-verification-otp`, `type: 'forget-password'`) e
    "Reenviar código" (`request-password-reset` de novo).
  - **Nova senha:** schema de senha + confirmação extraído do cadastro. "Redefinir senha" chama `reset-password`.
    Com sucesso, `navigate('/login', { replace: true, state: { notice: 'password-reset', email } })`.
- **`/confirmar-email`:** página com o e-mail vindo do `state` do router. Sem e-mail (aberta direto ou recarregada),
  mostra antes um campo de e-mail. `CodeStep` com:
  - "Confirmar e-mail": chama `verify-email`; com sucesso,
    `navigate('/login', { replace: true, state: { notice: 'email-verified', email } })`;
  - "Reenviar código": chama `send-verification-email`.
- **Cadastro:** ao terminar, `navigate('/confirmar-email', { replace: true, state: { email, from: 'sign-up' } })`.
  Texto: "Enviamos um código de 6 dígitos para {email}. Ele vale por 10 minutos."
- **Login:**
  - link "Esqueci minha senha" junto do campo de senha;
  - `403` com `body.code === 'EMAIL_NOT_VERIFIED'` leva a
    `navigate('/confirmar-email', { state: { email, from: 'sign-in' } })`, com o texto "Confirme seu e-mail para
    entrar. Se o código que enviamos expirou, peça um novo.";
  - `state.notice` mostra um alerta de sucesso ("Senha redefinida. Entre com a nova senha." ou "E-mail confirmado.
    Entre com sua senha.") e preenche o e-mail.
- **Alternativa recusada:** entrar automaticamente depois de confirmar (`autoSignInAfterVerification`). Quem tivesse
  só o código ganharia sessão sem senha, e o MVP já decidiu que o cadastro termina no login (`autoSignIn: false`).

### D11. Mensagens de erro

Um único mapeamento em `features/auth/code-messages.ts`, usado pelas duas telas:

| Resposta                    | Mensagem                                                                          | Ação           |
| --------------------------- | --------------------------------------------------------------------------------- | -------------- |
| `429` no pedido/reenvio     | "Você só pode pedir um código a cada 10 minutos. Tente de novo em {n} minuto(s)." | fica na etapa  |
| `INVALID_OTP`               | "Código incorreto. Confira o e-mail e tente de novo."                             | fica no código |
| `OTP_EXPIRED`               | "Este código expirou. Peça um novo código."                                       | pedir novo     |
| `TOO_MANY_ATTEMPTS`         | "Você errou o código muitas vezes. Peça um novo código."                          | pedir novo     |
| `429` na verificação        | "Muitas tentativas seguidas. Aguarde um instante e tente de novo."                | fica na etapa  |
| outro erro / sem conexão    | "Não foi possível concluir agora. Tente novamente em instantes."                  | fica na etapa  |

- `{n}` é `ceil(retryAfter / 60)`; sem o header, a frase termina em "a cada 10 minutos.".
- "Pedir novo" na recuperação volta à etapa do e-mail com o e-mail preenchido; na confirmação, destaca "Reenviar
  código".
- Na etapa da nova senha, `INVALID_OTP` (código já usado ou substituído) recebe a mesma ação de `OTP_EXPIRED`.

### D12. Divergências do protótipo

- O subtítulo da nova senha vira "Use de 8 a 72 caracteres." (sem histórico de senhas, nenhum RF).
- A tela "Confirme seu e-mail" não existe no protótipo. Ela segue o layout de "Verifique seu e-mail" da
  recuperação, com o título trocado.
- O resto segue o protótipo: títulos "Esqueci minha senha", "Verifique seu e-mail", "Crie uma nova senha" e os
  botões.

## Risks / Trade-offs

- [Rate limit em memória zera no redeploy] → aceito em `docs/MODELO-DE-DADOS.md`; o efeito é no máximo um pedido
  a mais logo depois de um deploy.
- [Várias pessoas atrás do mesmo IP (rede de uma ONG, CGNAT de operadora) dividem o limite] → é o que o RNF11
  pede ("por origem de acesso"). A mensagem diz quanto falta.
- [IP não identificado atrás do proxy vira balde único] → verificação obrigatória no staging (D4) antes de marcar
  o item como pronto.
- [Cota baixa do Resend, dividida com os alertas do Gatus, agora com um e-mail por cadastro] → limites por IP no
  reenvio e na recuperação, limite do cadastro (10 por hora por IP), nenhum envio a conta inexistente ou excluída,
  login sem envio (D5) e código no log em dev.
- [Cadastro desfeito depois do envio do código] → o usuário é apagado; o código sobra em `verification` e expira
  em 10 minutos. Um novo cadastro com o mesmo e-mail gera outro código, que substitui o anterior.
- [Conta apagada pela tarefa enquanto a pessoa digita o código] → só acontece depois de 24 horas sem confirmar.
  A confirmação falha com código inválido, e a pessoa se cadastra de novo.
- [Chamada interna bloqueada pelo `disabledPaths` (D2)] → conferido no início do apply, com plano B definido.
- [3 erros de digitação = esperar até 10 min] → decisão da dupla (DT37). A mensagem explica o que fazer.
- [Código guardado em texto puro em `verification`] → vale 10 minutos, uso único, banco não exposto. Pode virar
  `hashed` depois sem mudar a spec.
- [Falha do Resend fica invisível para quem pediu] → a resposta não pode mudar (DT36). O erro vai para o log, e
  quem não recebeu pode pedir de novo após 10 minutos.

## Migration Plan

1. Criar/confirmar `RESEND_API_KEY` e `EMAIL_FROM` (só o endereço) no recurso do backend no Coolify (staging) antes
   do deploy.
2. Deploy com a migration do `emailVerified`. Em seguida, a dupla reseta o banco do staging (`migrate reset --force`
   + `db seed`) e o bucket, como já faz.
3. No staging, com e-mail real:
   - cadastro → confirmação → login;
   - recuperação de senha completa;
   - segundo pedido em menos de 10 minutos recusado com mensagem;
   - conferir o log de IP (D4).
4. Rollback: reverter o commit e a migration. Os códigos que ficarem em `verification` expiram sozinhos. Contas
   criadas nesse intervalo ficam com `emailVerified: false`, o que não bloqueia nada com
   `requireEmailVerification` desligado.
