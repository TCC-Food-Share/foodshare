## 1. Configuração (backend)

- [x] 1.1 Instalar `@aws-sdk/client-s3` e `@types/multer` (dev). Conferir que
      nenhum dos dois traz binário nativo (`docs/INFRAESTRUTURA.md`, ARM64).
      Subir `@nestjs/common`, `core`, `platform-express` e `testing` para
      11.2.7, que traz o `multer` 2.4.0 sem as vulnerabilidades de DoS e de
      limite de tamanho do 2.2.0 (decidido no apply).
- [x] 1.2 `backend/.env.example`: `MINIO_ENDPOINT="http://localhost:9000"`,
      `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (os valores do
      `docker-compose.yml` local) e `MINIO_BUCKET="foodshare-dev"`, com
      comentário curto (staging: URL interna do MinIO no Coolify). Remover
      `MINIO_PORT`. Atualizar o `.env` local.

## 2. Módulo `files` (backend)

- [x] 2.1 `files/files.constants.ts`: `IMAGE_FOLDER`, `MAX_IMAGE_SIZE`
      (5 MB), códigos `IMAGE_REQUIRED`, `IMAGE_TOO_LARGE`,
      `IMAGE_INVALID_TYPE` e o mapa tipo → extensão/`ContentType` (design D3, D4).
- [x] 2.2 Detecção do tipo pela assinatura (JPEG, PNG, WebP) e `ImageFilePipe`
      com as opções obrigatório/opcional, respondendo `400` com
      `{ code, message }` (design D4).
- [x] 2.3 `ImageStorageService`: `S3Client` (`forcePathStyle`), criação do
      bucket no `onModuleInit` com log se o MinIO estiver fora (sem derrubar a
      API), `store`, `remove` e `toUrl` (design D3).
- [x] 2.4 Decorator `@ImageUpload()`: `FileInterceptor('image')` com
      `limits`, `@ApiConsumes('multipart/form-data')` e a tradução de `413`
      para `400 IMAGE_TOO_LARGE` (design D5).
- [x] 2.5 `FilesController` `GET /files/:folder/:name`: validação de pasta e
      nome (`404` sem chamar o MinIO), `NoSuchKey` → `404`, `StreamableFile`
      com `Content-Type` e `Cache-Control: private, max-age=31536000, immutable`.
      Tag "Arquivos" no Scalar (design D7).
- [x] 2.6 `FilesModule` global, registrado no `AppModule`.
- [x] 2.7 Testes unitários: assinaturas (JPEG, PNG, WebP aceitos; GIF, PDF
      renomeado e arquivo vazio recusados), limite de 5 MB exato e +1 byte,
      ausência obrigatória/opcional, validação de pasta/nome no controller
      (`..`, prefixo desconhecido, UUID inválido) e `toUrl` (`null` e chave).

## 3. Cadastro e edição das instituições (backend)

- [x] 3.1 `establishments`: `@ImageUpload()` no `POST` (imagem obrigatória) e
      no `PATCH me` (opcional). Remover `image` do `UpdateEstablishmentDto`.
      Documentar no Scalar o formulário e os `400` de imagem.
- [x] 3.2 `EstablishmentsService.create`: upload depois da unicidade, `image`
      no `signUpEmail` e `remove(key)` em qualquer falha posterior (design D6).
- [x] 3.3 `EstablishmentsService.update`: upload da imagem nova, transação,
      `remove(newKey)` na falha e `remove(oldKey)` depois do commit, com log de
      erro (design D6).
- [x] 3.4 `EstablishmentsService.toResponse`: `image` via `toUrl` (design D8).
- [x] 3.5 Repetir 3.1–3.4 em `beneficiary-entities`.
- [x] 3.6 `GET /me` (`app.controller.ts`): `image` da sessão via `toUrl`.
- [x] 3.7 Testes unitários dos dois services: cadastro grava a chave e
      responde com URL; unicidade recusada não grava arquivo; falha na
      transação apaga usuário e objeto; edição sem arquivo não mexe na imagem;
      edição com arquivo troca e apaga a anterior; falha na edição apaga a nova
      e mantém a anterior; falha ao apagar a anterior não falha a edição.
- [x] 3.8 Atualizar os specs de controller/DTO existentes que montam o corpo
      com `image` em texto (o campo deixa de existir).

## 4. Base do frontend

- [x] 4.1 `lib/api.ts`: corpo `FormData` enviado sem `Content-Type` e sem
      `JSON.stringify` (design D9).
- [x] 4.2 `lib/form-data.ts`: `toFormData(values, files)` com chaves
      `pai[filho]`, pulando `undefined`, `null` e `''`.
- [x] 4.3 `features/files/image-rules.ts` (limite, tipos aceitos,
      `imageFileSchema` em zod) e `features/files/image-errors.ts` (mensagem
      pt-BR por `code`).
- [x] 4.4 `features/files/image-picker.tsx`: input escondido com `accept`,
      botão "Escolher foto"/"Trocar foto", prévia por `createObjectURL`
      (revogada na troca e na desmontagem) ou pela URL atual, e mensagem de
      erro do campo. Controlado por `value`/`onChange` para o `FormField`.

## 5. Cadastro (frontend)

- [x] 5.1 `sign-up-schema.ts`: `image` obrigatório com `imageFileSchema`, em
      `STEP_FIELDS[4]`, com mensagem "Envie uma foto de perfil.".
- [x] 5.2 `profile-photo-step.tsx` com o `ImagePicker`. `WizardProgress` com
      o 5º título/subtítulo e "Etapa X de 5". `LAST_STEP = 4` em
      `sign-up-page.tsx`. Manter o botão de submit fora do slot que alterna
      `type` (trap do wizard multi-etapa).
- [x] 5.3 `sign-up-api.ts`: envio em `toFormData(payload, { image })`.
- [x] 5.4 Tratamento do `400` com `code` `IMAGE_*`: volta para a etapa 4 e
      mostra a mensagem no campo. Os `409` existentes continuam voltando para
      a etapa do campo e mantêm a imagem escolhida.

## 6. Perfil (frontend)

- [x] 6.1 `profile-schema.ts`: `image` como `File | null` opcional com
      `imageFileSchema`; o valor inicial é `null`.
- [x] 6.2 `profile-form.tsx`: trocar o campo "URL da imagem/logotipo" pelo
      `ImagePicker`, com a URL atual como prévia inicial.
- [x] 6.3 `profile-page.tsx` / `profile-api.ts`: PATCH em JSON sem arquivo
      novo, em `FormData` com arquivo novo. Sem `image` em texto no corpo.
      Mensagem por `code` no campo quando o servidor recusar a imagem.
- [x] 6.4 `profile-view.tsx` e onde mais a imagem do usuário aparece: usar a
      URL da API como está, com o fallback de "sem imagem" se o carregamento
      falhar.
- [x] 6.5 Avatar do header (`UserMenu`) com a imagem da sessão e fallback
      para as iniciais, pelo componente compartilhado `UserAvatar`; o
      `AuthContext` ganha `refreshSession`, chamado depois de salvar uma foto
      nova, para o header trocar junto (achado no teste manual).

## 7. Documentação

- [x] 7.1 `docs/INFRAESTRUTURA.md` ("Armazenamento de imagens"): upload
      junto do recurso, em vez de `POST /files`; leitura em
      `GET /files/:folder/:name`; criação do bucket na subida.
- [x] 7.2 `docs/PLANO-IMPLEMENTACAO.md` (0.3): trocar `POST /files` pelo
      upload junto do cadastro e da edição. Nas seções 2.1 e 5.1, citar o
      padrão (`@ImageUpload()` + `IMAGE_FOLDER`).
- [x] 7.3 `docs/MODELO-DE-DADOS.md` ("Imagens"): a rota de leitura e a
      remoção da imagem anterior depois do commit, na troca.
- [x] 7.4 Script `npm run storage:clear` (`backend/scripts/clear-storage.ts`)
      para esvaziar o bucket do ambiente, com confirmação pelo nome do bucket
      e `--force`; cliente S3 compartilhado em `files/storage-client.ts`.
      Documentado em `docs/INFRAESTRUTURA.md` (pedido no apply).

## 8. Verificação e fechamento

- [x] 8.1 `npm run lint`, `npm test` e `tsc` no backend e no frontend, sem
      erro. Não rodar `npm run build` no backend com o `start:dev` ligado.
- [x] 8.2 No navegador (dev, com MinIO local): cadastro de estabelecimento e
      de entidade com foto → `/login` → login → perfil mostra a foto pela rota
      `/files/...`. Bucket criado sozinho na primeira subida. Console limpo.
- [x] 8.3 No navegador: o componente recusa arquivo acima de 5 MB e GIF antes
      de enviar; o wizard não conclui sem foto; `409` de CNPJ volta para a
      etapa institucional sem perder a foto.
- [x] 8.4 Via curl: PDF renomeado para `.png` → `400 IMAGE_INVALID_TYPE`;
      6 MB → `400 IMAGE_TOO_LARGE`; cadastro sem arquivo →
      `400 IMAGE_REQUIRED`; `image` em texto no `PATCH me` → `400`;
      `GET /files/...` sem sessão → `401`, com `..` ou pasta desconhecida →
      `404`. Conferir os cabeçalhos `Content-Type` e `Cache-Control`.
- [x] 8.5 No navegador: trocar a foto no perfil mostra a nova, e o objeto
      anterior some do bucket (console do MinIO ou `mc ls`). Salvar só a
      descrição mantém a foto. Cadastro recusado por unicidade não deixa
      objeto no bucket.
- [x] 8.6 Fluxo do MVP de ponta a ponta continua funcionando (cadastrar
      alimento com URL → pedir → aceitar → confirmar).
- [x] 8.7 Marcar ✅ o item 0.3 em `docs/PLANO-IMPLEMENTACAO.md`.
- [ ] 8.8 Registrar no PR para `develop` os passos manuais: variáveis
      `MINIO_*` no Coolify do staging antes do merge e, depois do deploy,
      cadastro com foto no staging conferindo que a imagem carrega pelo
      domínio da API.
