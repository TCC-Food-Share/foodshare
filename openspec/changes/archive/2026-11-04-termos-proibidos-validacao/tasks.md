## 1. Backend: regra pura

- [x] 1.1 Criar `content-moderation/prohibited-content.ts` com `containsProhibitedTerm(text, terms)`, comparando por palavra inteira sobre `normalizeText`.
- [x] 1.2 Acrescentar `containsLink(text)` com os padrões de esquema, `www.` e domínio (lista de TLDs e caminho), conforme `design.md`.
- [x] 1.3 Testar em `prohibited-content.spec.ts` os cenários da spec: maiúsculas e acento, pontuação, várias palavras, "enviado/reputação/disputa", "merdas", cada forma de link, e-mail, telefone, `@perfil`, `1.5kg`, `18h.Trazer`, `Ltda.ME`, `wa.me/...`, `site.comida`, termo vazio após normalizar.

## 2. Backend: validador e erro

- [x] 2.1 Criar o validador assíncrono injetável e o decorator `@NoProhibitedContent()`, lendo `prohibited_term` a cada validação, com valor que não é texto tratado como válido (o `@IsString` reporta).
- [x] 2.2 Criar `ContentModerationModule`, importá-lo no `AppModule` e chamar `useContainer(app.select(AppModule), { fallbackOnErrors: true })` em `main.ts`.
- [x] 2.3 Criar `common/app-validation.pipe.ts` e usá-lo como pipe global, com as mesmas opções atuais, respondendo `{ code: 'PROHIBITED_CONTENT', message, fields }` quando todos os erros forem de conteúdo.
- [x] 2.4 Testar o validador (termo novo vale na chamada seguinte, com Prisma mockado) e o pipe (`fields` com dois campos, erro misto cai no `400` comum, outros `400` mantêm o corpo, validadores nativos seguem funcionando).

## 3. Backend: aplicação nos DTOs

- [x] 3.1 Aplicar `@NoProhibitedContent()` em `description` e `tradeName` de `CreateEstablishmentDto` e `CreateBeneficiaryEntityDto`.
- [x] 3.2 Aplicar em `description` de `UpdateEstablishmentDto` e `UpdateBeneficiaryEntityDto`.
- [x] 3.3 Aplicar em `description` e `notes` de `CreateFoodDto`.
- [x] 3.4 Citar `PROHIBITED_CONTENT` no `@ApiBadRequestResponse` das rotas afetadas, em pt-BR.
- [x] 3.5 Conferir por chamada à API que a recusa acontece em multipart, sem criar conta, alimento ou objeto no MinIO, e que os testes do backend passam.

## 4. Frontend

- [x] 4.1 Criar `lib/prohibited-content.ts` com `prohibitedContentFields(error)` e a mensagem em pt-BR.
- [x] 4.2 Tratar em `sign-up-page.tsx`: erro no campo, sem banner, voltando para a etapa 1 pelo `FIELD_TO_STEP`, antes do ramo genérico de `400`.
- [x] 4.3 Tratar em `profile-page.tsx`: erro em `description`, mantendo o modo de edição.
- [x] 4.4 Tratar em `create-food-dialog.tsx`: erro em `description` e `notes`, mantendo o modal aberto.
- [x] 4.5 Rodar `tsc` e `eslint` no frontend.

## 5. Documentação

- [x] 5.1 Registrar a DT24 em `docs/REQUISITOS.md`: palavra inteira, links e domínios (telefone e `@perfil` passam) e campos cobertos (razão social, responsável e endereço fora).
- [x] 5.2 Acrescentar em `docs/CONVENCOES.md` que todo campo novo de texto livre usa `@NoProhibitedContent()`, e o erro `PROHIBITED_CONTENT`.
- [x] 5.3 Registrar nos itens 1.5, 4.2, 5.2 e 5.4 de `docs/PLANO-IMPLEMENTACAO.md` a aplicação do decorator nos campos daquelas changes.

## 6. Verificação ponta a ponta

- [x] 6.1 No navegador, cadastrar estabelecimento e entidade com termo na descrição e link no nome fantasia: conferir a volta para a etapa certa, o erro nos dois campos e os dados mantidos.
- [x] 6.2 Na edição de perfil, conferir a recusa na descrição, e que corrigir o texto salva.
- [x] 6.3 No modal de alimento, conferir a recusa em descrição e observações, e que "Alimento enviado, boa reputação" é aceito.
- [x] 6.4 Cadastrar um termo novo no painel e conferir a recusa no formulário sem reiniciar o backend; excluí-lo e conferir o aceite.
- [x] 6.5 Marcar ✅ o item 1.4 em `docs/PLANO-IMPLEMENTACAO.md`.
