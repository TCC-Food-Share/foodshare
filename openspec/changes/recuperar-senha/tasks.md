## 1. Backend: envio do e-mail

- [x] 1.1 Instalar `resend` no backend (conferir a API atual do SDK com `ctx7` antes de usar)
- [x] 1.2 Acrescentar `RESEND_API_KEY` e `EMAIL_FROM` ao `backend/.env.example`, com comentário curto (códigos de recuperação de senha e de confirmação de e-mail, RN45); `EMAIL_FROM` só com o endereço (`nao-responda@foodshare.com.br`), o nome "Food Share" vem do código (design D3)
- [x] 1.3 Criar `mail/verification-code.ts` com `createVerificationCodeSender(prisma)` (design D3):
  - ignora `type` diferente de `forget-password` e `email-verification`;
  - dispara a entrega sem `await`; a entrega consulta `user.deleted` pelo e-mail e não envia para conta inexistente ou excluída;
  - envia pelo Resend com `from: Food Share <EMAIL_FROM>` e o texto em pt-BR de cada tipo;
  - trata `{ error }` do SDK e exceção com `logger.error`, sem o código no log;
  - fora de produção e sem chave, só loga o código com `logger.warn`
- [x] 1.4 Testes de unidade em `verification-code.spec.ts`, com Resend e Prisma falsos:
  - os dois tipos enviam para conta ativa, com o assunto certo e o remetente `Food Share <...>`;
  - não envia para conta excluída nem inexistente, e ignora outros `type`;
  - erro do SDK (retorno e exceção) vira log de erro sem o código e não rejeita a promessa devolvida;
  - sem chave em dev, loga e não chama o Resend

## 2. Backend: configuração do better-auth

- [x] 2.1 Em `auth.instance.ts`, adicionar o plugin `emailOTP` como no design D1 (`otpLength: 6`, `expiresIn: 600`, `allowedAttempts: 3`, `disableSignUp: true`, `overrideDefaultEmailVerification: true`, `sendVerificationOTP` da 1.3 com o `prisma` do arquivo)
- [x] 2.2 Em `emailAndPassword`: `requireEmailVerification: true`, `revokeSessionsOnPasswordReset: true`, `maxPasswordLength: 72`. Acrescentar `emailVerification: { sendOnSignUp: true, sendOnSignIn: false, autoSignInAfterVerification: false }` (design D1, D5)
- [x] 2.3 Acrescentar `rateLimit.customRules` para `/email-otp/request-password-reset` e `/send-verification-email`, ambas `{ window: 600, max: 1 }`, sem mudar `enabled` (design D4)
- [x] 2.4 Ajustar `disabledPaths` conforme a tabela do design D2:
  - tirar `/send-verification-email`;
  - acrescentar `/sign-in/email-otp`, `/email-otp/send-verification-otp`, `/forget-password/email-otp`, `/email-otp/request-email-change` e `/email-otp/change-email`
- [x] 2.5 Conferir logo no início que o cadastro e o `/send-verification-email` geram o código mesmo com `/email-otp/send-verification-otp` desabilitada (chamada interna, design D2). Se não gerarem, aplicar o plano B do D2 e registrar no design
- [x] 2.6 Em `main.ts`, `exposedHeaders: ['X-Retry-After']` no `enableCors` (design D9)
- [x] 2.7 Em `main.ts`, resumo e descrição em pt-BR das cinco rotas do D2 em `authOperationOverrides`, e o `403 EMAIL_NOT_VERIFIED` na descrição do login. Atualizar a descrição da tag "Autenticação". Conferir no Scalar que as rotas desabilitadas não aparecem; se aparecerem, somar ao `hiddenAuthPaths`

## 3. Backend: schema, seed e limpeza

- [x] 3.1 Trocar `User.emailVerified` para `@default(false)` no `schema.prisma` e gerar a migration (`prisma migrate dev`), avisando para reiniciar o `start:dev` depois (design D7)
- [x] 3.2 No `prisma/seed.ts`, criar o primeiro administrador pelo contexto interno do better-auth com `emailVerified: true` e o hash do próprio better-auth, sem disparar e-mail. Conferir os nomes dos métodos no código instalado e manter o seed idempotente (design D6)
- [x] 3.3 Instalar `@nestjs/schedule` 6.x (conferir a doc com `ctx7`) e registrar `ScheduleModule.forRoot()` uma vez, no `AppModule`
- [x] 3.4 Criar `jobs/unverified-accounts-cleanup.service.ts` (design D8):
  - `@Cron` de hora em hora e registro no `JobsService` como `unverified-accounts-cleanup`;
  - por conta: transação com trava `FOR UPDATE` em `emailVerified = false`, exclusão da instituição, endereço, sessões, contas, códigos e usuário;
  - imagem removida do MinIO depois do commit;
  - erro de uma conta só vai para o log;
  - devolve `{ affected }`
- [x] 3.5 Testes de unidade da limpeza:
  - apaga a conta não confirmada de 25 h, com a instituição, o endereço e a imagem (depois do commit);
  - mantém a de 23 h e a confirmada;
  - não apaga quando a trava não encontra a linha (confirmada no meio);
  - erro em uma conta não impede as outras;
  - `affected` certo
- [x] 3.6 Rodar `npm run lint`, `npx tsc --noEmit` e `npm test` no backend (sem `npm run build` com o `start:dev` ligado)

## 4. Backend: conferência por curl em dev

- [x] 4.1 Com o `start:dev` reiniciado e o código aparecendo no console (sem chave do Resend), conferir a confirmação:
  - cadastro de estabelecimento loga o código de confirmação;
  - login com a senha certa responde `403 EMAIL_NOT_VERIFIED` sem logar código; com a senha errada, `401` genérico;
  - `verify-email` errado dá `INVALID_OTP`, e o 3º erro leva a `TOO_MANY_ATTEMPTS`;
  - `send-verification-email` gera um código novo, que substitui o anterior;
  - para e-mail inexistente, já confirmado ou de conta excluída, a resposta é a mesma e não há log de código;
  - `verify-email` certo não abre sessão, e o login passa a funcionar
- [x] 4.2 Conferir a recuperação:
  - pedido para conta ativa loga o código; e-mail inexistente e conta excluída respondem `{ success: true }` sem log de código;
  - `check-verification-otp` certo responde sucesso, errado responde `INVALID_OTP`, e o 3º erro leva a `TOO_MANY_ATTEMPTS`;
  - `reset-password` troca a senha: o login com a nova funciona e com a antiga dá `401`, e a sessão aberta antes deixa de valer em `GET /me`;
  - o mesmo código reutilizado dá `INVALID_OTP`;
  - senha com 7 e com 73 caracteres é recusada;
  - conta não confirmada que redefine a senha fica confirmada
- [x] 4.3 Conferir que as rotas desabilitadas (`/auth/sign-in/email-otp`, `/auth/email-otp/send-verification-otp`, `/auth/forget-password/email-otp`, `/auth/verify-email`) respondem 404
- [x] 4.4 Ligar `rateLimit.enabled: true` só para o teste:
  - o segundo pedido de recuperação e o segundo reenvio de confirmação em menos de 10 minutos respondem `429` com `X-Retry-After`, inclusive para outro e-mail;
  - um pedido em uma rota não bloqueia a outra;
  - desfazer a alteração antes de seguir
- [x] 4.5 Conferir a limpeza:
  - recuar o `createdAt` de uma conta não confirmada para 25 h atrás e rodar `POST /admin/jobs/unverified-accounts-cleanup/run` como administrador;
  - a conta, a instituição, o endereço e a imagem somem e `affected` é `1`;
  - o mesmo CNPJ e e-mail voltam a ser aceitos no cadastro

## 5. Frontend: base

- [x] 5.1 Em `lib/api.ts`, `ApiError` ganha `retryAfter?: number`, lido do header `X-Retry-After` nas respostas `429` (design D9)
- [x] 5.2 Adicionar o componente `input-otp` do shadcn (CLI do shadcn, conferir a doc atual com `ctx7`)
- [x] 5.3 Extrair do `sign-up-schema.ts` o schema de senha + confirmação (8 a 72 caracteres, "As senhas não conferem.") para reaproveitar, sem mudar o cadastro
- [x] 5.4 Em `features/auth/api.ts`, acrescentar:
  - `requestPasswordReset(email)`;
  - `checkResetCode(email, otp)`, com `type: 'forget-password'`;
  - `resetPassword(email, otp, password)`;
  - `verifyEmail(email, otp)`;
  - `resendVerificationCode(email)`
- [x] 5.5 Criar `features/auth/code-messages.ts` com o mapeamento do design D11 (por `status`, `body.code` e `retryAfter`) e o teste de unidade (429 com e sem `retryAfter`, arredondamento para minutos, cada código do plugin, erro genérico). **Sem o teste de unidade:** o frontend não tem runner de testes, e montar um só para isto fugiria do escopo; o mapeamento é conferido no navegador (8.1)
- [x] 5.6 Criar `features/auth/code-step.tsx` (design D10): `InputOTP` de 6 dígitos, botão principal por parâmetro, "Reenviar código", "Voltar para o login" e as mensagens da 5.5

## 6. Frontend: telas

- [x] 6.1 Rotas públicas `/esqueci-senha` e `/confirmar-email` em `app/router.tsx`, com o mesmo `AuthLayout` do login; quem já está autenticado vai para a home do papel
- [x] 6.2 `ForgotPasswordPage` com as três etapas do design D10, o e-mail e o código só em estado local:
  - **e-mail:** "Esqueci minha senha", texto do protótipo, "Enviar código";
  - **código:** "Verifique seu e-mail", "Se o e-mail estiver cadastrado, enviamos…", "Verificar código" e "Reenviar código";
  - **nova senha:** "Crie uma nova senha", "Use de 8 a 72 caracteres." (D12), "Redefinir senha";
  - expirado, tentativas esgotadas e código inválido na nova senha mostram "Pedir um novo código" (volta ao e-mail preenchido)
- [x] 6.3 `ConfirmEmailPage`:
  - título "Confirme seu e-mail", com o texto conforme a origem (`sign-up` ou `sign-in`, design D10);
  - campo de e-mail quando não houver e-mail no `state`;
  - `CodeStep` com "Confirmar e-mail" e "Reenviar código" (toast de reenvio ou mensagem do 429);
  - sucesso leva a `/login` com `notice: 'email-verified'`
- [x] 6.4 No `SignUpPage`, o fim do cadastro leva a `/confirmar-email` com o e-mail pessoal no `state` (sem passar pelo endereço)
- [x] 6.5 Em `LoginPage`:
  - link "Esqueci minha senha" junto do campo de senha;
  - `403` com `EMAIL_NOT_VERIFIED` leva a `/confirmar-email` com o e-mail;
  - alerta de sucesso para `notice` (`password-reset` ou `email-verified`), com o e-mail preenchido
- [x] 6.6 Rodar `npm run lint`, `npx tsc -b` e os testes do frontend (sem `eslint --fix` com o Vite ligado)

## 7. Documentação

- [x] 7.1 Em `docs/REQUISITOS.md`:
  - **RF75 novo:** confirmação do e-mail pessoal por código no cadastro, obrigatória antes do primeiro login;
  - **escopo:** tabela atualizada (cadastro com confirmação de e-mail; "E-mail de notificação" diz que só recuperação e confirmação usam e-mail);
  - **RN45 revisada:** os únicos e-mails são o código de recuperação e o de confirmação;
  - **RN47 nova:** conta só faz login com e-mail confirmado; só o administrador do seed nasce confirmado;
  - **RN48 nova:** conta não confirmada há mais de 24 h é apagada de vez, de hora em hora;
  - **DT36 a DT39**, citadas na observação do RF08 e do RF75;
  - **RNF12:** acrescentar o RF75 aos requisitos relacionados
- [x] 7.2 Em `docs/MODELO-DE-DADOS.md`, registrar `emailVerified` com padrão `false`, o uso de `verification` também pela confirmação e a exclusão definitiva das contas não confirmadas
- [x] 7.3 Em `docs/INFRAESTRUTURA.md`:
  - **Resend:** dois usos, recuperação e confirmação;
  - **`EMAIL_FROM`:** só o endereço, na seção do Resend e na tabela de variáveis;
  - **dev sem `RESEND_API_KEY`:** o código aparece no log;
  - **IP atrás do Traefik:** a conferência do design D4;
  - **tarefas agendadas:** a limpeza de hora em hora, ao lado da diária
- [x] 7.4 Em `docs/PLANO-IMPLEMENTACAO.md`:
  - item 4.1: acrescentar RF75, RN47 e RN48 na coluna "Cobre" e a confirmação de e-mail na descrição;
  - nota nos itens 5.1 e 5.2: as contas criadas pelo administrador também exigem confirmação (DT39)

## 8. Verificação ponta a ponta e fechamento

- [x] 8.1 No navegador (dev), com o código do console:
  - cadastro → tela de confirmação → código → login com aviso → entrada;
  - login antes de confirmar → tela de confirmação → reenviar → confirmar;
  - recuperação completa pelo link do login;
  - código errado, 3 erros, voltar para o login, confirmação de senha diferente e senha curta;
  - e-mail e código não aparecem no endereço;
  - nenhum erro no console além do `401` esperado do `/me`
- [x] 8.2 Pedir à dupla o reset do banco local e conferir o seed: o administrador entra sem confirmação e nenhum código aparece no log
- [ ] 8.3 No staging, depois do deploy com `RESEND_API_KEY` e `EMAIL_FROM` configurados, `NODE_ENV=production` confirmado e o banco resetado:
  - cadastro e recuperação com e-mail real (remetente "Food Share", domínio `foodshare.com.br`);
  - segundo pedido em menos de 10 minutos recusado com a mensagem e o tempo restante;
  - log do backend sem o aviso "Rate limiting could not determine a client IP". Se aparecer, ajustar `advanced.ipAddress` conforme o design D4 e repetir
- [ ] 8.4 Marcar ✅ o item 4.1 em `docs/PLANO-IMPLEMENTACAO.md`
