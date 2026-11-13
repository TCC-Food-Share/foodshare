## 1. Backend: DTOs de edição

- [x] 1.1 Criar `common/trim-to-null.ts` (apara espaços; string vazia vira `null`; outros tipos passam como vieram), ao lado do `trimToUndefined`, com teste de unidade (design D2)
- [x] 1.2 Em `update-establishment.dto.ts`, acrescentar:
  - `tradeName`: `@Transform(trimToNull)`, `@IsOptional()`, `@IsString()`, `@MaxLength(200)`, `@NoProhibitedContent()`;
  - `name`: `@Transform` que só apara, `@IsOptional()`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)`, sem `@NoProhibitedContent()` (DT24);
  - `@ApiPropertyOptional` em pt-BR com `example` em inglês; o do `tradeName` diz que vazio apaga o valor (DT40)
- [x] 1.3 Repetir a 1.2 em `update-beneficiary-entity.dto.ts`

## 2. Backend: services e controllers

- [x] 2.1 Em `establishments.service.ts` `update()`:
  - `name` entra no `tx.user.update` junto de `personalPhone` e `image` (a condição de entrada no update passa a incluir `name`);
  - `tradeName !== undefined` entra no `tx.establishment.update` (`null` apaga);
  - sem mudança na unicidade, na transação nem na troca de imagem
- [x] 2.2 Repetir a 2.1 em `beneficiary-entities.service.ts`
- [x] 2.3 Atualizar a `description` do `@ApiOperation` dos dois `PATCH .../me`: campos editáveis do RF03 e fixos da RN27 (razão social, CNPJ, e-mail pessoal), e o nome fantasia vazio apagando o valor
- [x] 2.4 Testes de service (nos dois `*.service.spec.ts`):
  - grava `name` no usuário e `tradeName` na instituição;
  - `tradeName: null` apaga; campo ausente não entra no `data`;
  - só `name` enviado ainda atualiza o usuário
- [x] 2.5 Testes de validação dos dois DTOs (`plainToInstance` + `validate`, com o `ValidationPipe` do projeto): `tradeName` `''` e `'   '` viram `null` e passam; `tradeName` com 201 caracteres recusa; `name` `''` e `'   '` recusam; `name` com 201 caracteres recusa; `companyName`, `cnpj` e `email` continuam recusados por `forbidNonWhitelisted`
- [x] 2.6 Teste da moderação na edição: `tradeName` com termo proibido ou domínio recusa com `PROHIBITED_CONTENT` e `fields: ['tradeName']`; termo proibido só em `name` passa
- [x] 2.7 `npm run lint` e `npm test` no backend sem erro (sem `npm run build` com o `start:dev` ligado)

## 3. Frontend: envio multipart

- [x] 3.1 Em `lib/form-data.ts`, acrescentar a opção `keepEmpty` (chaves de primeiro nível enviadas mesmo com `''`) sem mudar o comportamento dos chamadores atuais (design D4)

## 4. Frontend: tela de perfil

- [x] 4.1 `profile-api.ts`: `UpdateProfilePayload` com `tradeName: string` e `name: string`; `updateMyProfile` passa `keepEmpty: ['tradeName']` ao `toFormData`
- [x] 4.2 `profile-schema.ts`: `tradeName` (`max(200)`, aceita vazio) e `name` (`trim`, obrigatório com "Informe o nome do responsável.", `max(200)`); `mapResponseToFormValues` com `tradeName ?? ''` e `user.name`
- [x] 4.3 `profile-form.tsx`: nome fantasia ("Nome fantasia (opcional)") e nome do responsável viram campos editáveis; razão social, CNPJ e e-mail pessoal continuam `LockedField`
- [x] 4.4 `profile-view.tsx`: tirar o cadeado do nome fantasia e do nome do responsável
- [x] 4.5 `profile-page.tsx`:
  - `defaultValues` e `onSubmit` com os campos novos;
  - marcar o erro de conteúdo proibido em cada campo devolvido em `fields` (`description`, `tradeName`);
  - `refreshSession()` depois de todo salvamento bem-sucedido
- [x] 4.6 `npm run lint` e `npx tsc -b` no frontend sem erro

## 5. Documentação

- [x] 5.1 `docs/REQUISITOS.md`: acrescentar a DT40 (nome fantasia pode ser apagado na edição do próprio perfil; volta a `null` e o nome público passa a ser a razão social, RN36) e citar a DT40 na observação do RF03. A coluna "Situação" do RF03 e do RF11 fica como está, porque compara com o MVP e as changes anteriores não a alteram

## 6. Verificação ponta a ponta e fechamento

- [x] 6.1 No navegador (dev), com um estabelecimento e uma entidade:
  - trocar nome do responsável e nome fantasia → tela e menu do usuário mostram os valores novos sem recarregar;
  - apagar o nome fantasia sem foto e com foto nova → "—" na tela e `tradeName: null` na resposta (conferir na aba de rede);
  - termo proibido no nome fantasia → erro no campo, demais campos preservados;
  - nome do responsável vazio → erro de validação na tela, nada enviado;
  - razão social, CNPJ e e-mail pessoal com cadeado nos dois modos;
  - nenhum erro no console além do `401` esperado do `/me` nas telas públicas
- [x] 6.2 Pela API (curl ou Scalar): `PATCH .../me` com `companyName`, `cnpj` ou `email` recusa com `400`; com `tradeName` vazio por multipart (`--form-string`) apaga o valor
- [x] 6.3 Marcar ✅ o item 4.2 em `docs/PLANO-IMPLEMENTACAO.md`
