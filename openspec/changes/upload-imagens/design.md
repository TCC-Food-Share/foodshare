## Context

- Não existe upload nem cliente de storage no backend. `User.image` e
  `Food.image` são `VarChar(500)` opcionais e, no MVP, guardavam URLs
  digitadas. Os DTOs de edição das instituições aceitam `image` como texto.
  O cadastro não recebe imagem.
- O MinIO já roda no `docker-compose.yml` local (`foodshare_admin` /
  `foodshare123`, porta 9000). No staging, ele só é acessível pela rede
  interna do Docker (`docs/INFRAESTRUTURA.md`).
- O `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` e
  `transform`. Os DTOs de cadastro e edição só têm campos de texto, inclusive
  o `address` aninhado.
- Express 5 (`express@5.2.1`), NestJS 11.1. O Jest roda em CommonJS
  (`ts-jest`).
- `GET /me` devolve o `session.user` do better-auth sem tratamento, então a
  imagem sairia como chave.
- No frontend, `lib/api.ts` sempre serializa o corpo como JSON. O wizard de
  cadastro tem 4 etapas e termina em `/login`. O perfil mostra a imagem
  atual e um campo "URL da imagem/logotipo".

## Goals / Non-Goals

**Goals:**

- Um único serviço de imagens (validar, gravar, apagar, montar URL) que a 2.1
  e a 5.1 reaproveitem só acrescentando o prefixo da pasta.
- Nenhum objeto órfão no MinIO por falha de cadastro ou de edição.
- Testes unitários sem MinIO de verdade e sem ESM no Jest.

**Non-Goals:**

- Streaming do upload direto para o MinIO: 5 MB em memória é aceitável numa
  instância única.
- URL pré-assinada ou acesso direto do navegador ao MinIO (não há domínio
  público).
- Limpeza periódica de objetos órfãos: o fluxo não os gera, e um eventual
  resto de falha ao apagar fica só registrado em log.

## Decisions

### D1. Upload junto do recurso, sem `POST /files`

O cadastro (`POST /establishments`, `POST /beneficiary-entities`) e a edição
(`PATCH .../me`) recebem `multipart/form-data`, com o arquivo no campo
`image` e os demais dados como campos de texto. A edição continua aceitando
JSON quando não há imagem. O multer só atua em requisições multipart, então o
mesmo handler atende os dois formatos.

*Alternativa:* `POST /files` devolvendo a chave e o recurso recebendo a chave
(o que `docs/INFRAESTRUTURA.md` previa). Rejeitada na proposta: exige upload
anônimo no cadastro, gera órfão quando o recurso falha e obriga o backend a
validar uma chave vinda do cliente.

### D2. Campos aninhados no multipart com colchetes

O multer monta o `req.body` com `append-field`, que transforma
`address[postalCode]` em `{ address: { postalCode } }`. Assim, o
`ValidationPipe` global valida o DTO de sempre, sem campo `data` com JSON
dentro nem pipe extra. Todos os campos dos DTOs atuais são texto, então nada
precisa de conversão de tipo. O frontend não envia campo opcional vazio:
chave ausente é diferente de string vazia para o `@IsOptional()`.

*Alternativa:* um campo `data` com o JSON dos dados e um pipe que faz
`JSON.parse` antes da validação. Rejeitada: o pipe global roda antes dos
pipes de parâmetro e veria uma string, e o Scalar documentaria um campo
opaco.

### D3. `files/` com `ImageStorageService`

O módulo `files/` (global, para os módulos de recurso não precisarem
importá-lo) concentra:

- **Cliente:** `S3Client` do `@aws-sdk/client-s3` com
  `endpoint: MINIO_ENDPOINT`, `forcePathStyle: true`, região fixa
  `us-east-1` (o MinIO ignora) e credenciais `MINIO_ACCESS_KEY` /
  `MINIO_SECRET_KEY`.
- **Bucket na subida:** `onModuleInit` faz `HeadBucket` e, se o bucket não
  existir, `CreateBucket` (privado, sem política pública). Se o MinIO estiver
  fora do ar, registra erro e deixa a API subir: o resto do sistema não
  depende de imagem, e o `/health` continua respondendo pelo banco.
- **`store(folder, file)`:** detecta o tipo (D4), gera
  `<folder>/<uuid v4>.<ext>` com `crypto.randomUUID()`, faz `PutObject` com o
  `ContentType` detectado e devolve a chave. Pastas válidas vêm de uma
  constante (`IMAGE_FOLDER = { USERS: 'users' }`); a 2.1 acrescenta `foods`.
- **`remove(key)`:** `DeleteObject`. Quem chama decide se a falha propaga ou
  vira log.
- **`toUrl(key)`:** `null → null`; senão `${BETTER_AUTH_URL}/files/${key}`.
  O `BETTER_AUTH_URL` já é a URL pública da API em cada ambiente, então não
  precisa de variável nova.

*Alternativa:* `MINIO_PUBLIC_URL` e URL direta no MinIO. Não existe: o MinIO
não tem domínio público.

### D4. Tipo real pela assinatura do arquivo, sem `file-type`

Um pipe próprio (`ImageFilePipe`) recebe o `Express.Multer.File` em memória e
confere, nesta ordem:

1. arquivo ausente → `IMAGE_REQUIRED` (só quando o pipe é usado como
   obrigatório, no cadastro);
2. `size > 5 * 1024 * 1024` → `IMAGE_TOO_LARGE`;
3. assinatura dos primeiros bytes: JPEG `FF D8 FF`; PNG
   `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF` nos bytes 0–3 e `WEBP` nos
   bytes 8–11. Qualquer outra → `IMAGE_INVALID_TYPE`.

Todos respondem `400` com `{ code, message }` (`docs/CONVENCOES.md`). O
`originalname` e o `mimetype` do cliente são ignorados. O tipo detectado
define extensão e `ContentType` (`jpg`/`image/jpeg`, `png`/`image/png`,
`webp`/`image/webp`).

*Alternativa:* `ParseFilePipe` + `FileTypeValidator` do NestJS. Rejeitada:
ele carrega o `file-type` (só ESM) por import dinâmico, o que quebra no Jest
em CommonJS sem `--experimental-vm-modules`. Além disso, o `exceptionFactory`
do `ParseFilePipe` só recebe a mensagem, e não dá para devolver uma `code`
diferente por motivo sem comparar texto. Os três formatos aceitos têm
assinaturas fixas e curtas, então o código próprio é pequeno e testável.

### D5. Limite do multer e tradução do `413`

O interceptor é `FileInterceptor('image', { limits: { fileSize: 5 MB, files: 1, fields: 30 } })`,
com armazenamento em memória (padrão sem `dest`). Quando o arquivo passa do
limite, o multer interrompe a leitura e o Nest lança
`PayloadTooLargeException` (`413`). Um decorator composto
`@ImageUpload()` aplica o `FileInterceptor`, o `@ApiConsumes('multipart/form-data')`
e um interceptor que converte esse `413` em `400` com
`code: IMAGE_TOO_LARGE`. Assim, o cliente vê um único contrato, venha o erro
do multer ou do pipe. A checagem de tamanho do pipe (D4) continua como
segunda barreira.

### D6. Ordem das operações e compensação

**Cadastro (`create(dto, file)`):**

1. `checkUniqueness(dto)` (como hoje).
2. `key = store(USERS, file)`.
3. `signUpEmail({ ..., image: key })`. O `image` é campo nativo do usuário no
   better-auth.
4. Transação de endereço + instituição (como hoje).
5. Em falha nos passos 3 ou 4: apaga o usuário (como hoje, no passo 4) e chama
   `remove(key)`, com erro só em log. A exceção original segue para o
   cliente.

Fazer o upload depois da checagem de unicidade evita gravar arquivo para a
maioria dos cadastros recusados. A corrida (P2002 na transação) cai na
compensação do passo 5.

**Edição (`update(userId, dto, file?)`):**

1. `checkUpdateUniqueness` (como hoje).
2. Se veio arquivo: `newKey = store(USERS, file)` e guarda a chave anterior.
3. Transação atual, com `image: newKey` no `user.update`.
4. Falha: `remove(newKey)` (log em erro), a exceção segue.
5. Sucesso: se havia chave anterior, `remove(oldKey)` depois do commit, com
   falha só em log (`Logger` do Nest). Isso segue a regra de
   `docs/MODELO-DE-DADOS.md` ("apaga o objeto depois do commit").

O `image` sai dos DTOs de edição. Como o `ValidationPipe` usa
`forbidNonWhitelisted`, um `image` em texto passa a ser recusado como campo
desconhecido, que é o cenário "Imagem enviada como texto" da spec.

### D7. Leitura: `GET /files/:folder/:name`

As chaves têm sempre dois segmentos (`<pasta>/<uuid>.<ext>`). Uma rota com
dois parâmetros atende a mesma URL de `/files/*key` sem o curinga do
Express 5, que entrega o parâmetro como array. O controller:

- valida `folder` contra `IMAGE_FOLDER` e `name` contra
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$`.
  Fora disso responde `404` sem chamar o MinIO, o que também barra `..`;
- faz `GetObject`. `NoSuchKey` vira `404`;
- devolve `StreamableFile` do corpo, com `Content-Type` do objeto e
  `Cache-Control: private, max-age=31536000, immutable`. É `private` porque a
  rota exige sessão e nenhum cache compartilhado deve guardar a imagem.

Qualquer papel autenticado lê (sem `@RequireRoles`). O `AuthGuard` global já
rejeita quem não tem sessão. A tag do Scalar é "Arquivos".

### D8. URL nas respostas

Os `toResponse` de `establishments` e `beneficiary-entities` passam a usar
`toUrl(user.image)`. `GET /me` devolve `{ ...session.user, image: toUrl(session.user.image) }`.
`Food.image` e as respostas de pedido que trazem imagem de alimento **não**
mudam nesta change (proposta, "Fora desta change"): a 2.1 troca o cadastro do
alimento e passa a usar `toUrl` também.

### D9. Frontend

- **`lib/api.ts`:** quando o `body` é `FormData`, envia como está, sem
  `Content-Type` (o navegador põe o boundary) e sem `JSON.stringify`.
- **`lib/form-data.ts`:** `toFormData(values, files)` achata objetos em
  `pai[filho]`, pula `undefined`, `null` e `''`, e anexa os arquivos.
- **`features/files/`:**
  - `image-rules.ts`: limite (5 MB) e tipos aceitos, espelhando o backend;
    schema zod `imageFileSchema` (`z.instanceof(File)` + tamanho + tipo).
  - `image-errors.ts`: mensagem pt-BR para cada `code` (`IMAGE_REQUIRED`,
    `IMAGE_TOO_LARGE`, `IMAGE_INVALID_TYPE`), num arquivo só
    (`docs/CONVENCOES.md`, rótulos por domínio).
  - `image-picker.tsx`: `<input type="file" accept="image/jpeg,image/png,image/webp">`
    escondido, botão "Escolher foto"/"Trocar foto", prévia por
    `URL.createObjectURL` (revogada na troca e na desmontagem) ou pela URL
    atual, e a mensagem de erro do campo. Controlado por `value: File | null`
    e `onChange`, para usar com `FormField` do react-hook-form.
- **Cadastro:** etapa 5 "Foto de perfil" (`profile-photo-step.tsx`),
  `LAST_STEP = 4`, títulos e contador ("Etapa X de 5") no `WizardProgress`.
  `image` no `signUpSchema` com `imageFileSchema` e em `STEP_FIELDS[4]`. O
  `FIELD_TO_STEP` leva `IMAGE_*` para a etapa 4. O envio vira
  `toFormData(payload, { image })`. A imagem fica no estado do formulário,
  então voltar a uma etapa anterior por `409` não a perde.
- **Perfil:** `image` no schema do perfil vira `File | null` (opcional). O
  `ImagePicker` recebe a URL atual para a prévia inicial. Sem arquivo
  novo, o PATCH segue em JSON como hoje; com arquivo, vai em `FormData`.
  Depois de salvar, a query do perfil é invalidada, e a URL nova (chave nova)
  fura o cache do navegador por construção.

## Risks / Trade-offs

- [O `<img>` aponta para outra origem (`api.*`, ou `localhost:3000` em dev) e
  depende do cookie de sessão.] → No staging, o `COOKIE_DOMAIN` já cobre os
  dois subdomínios e `SameSite=Lax` envia o cookie em subrecurso do mesmo
  site. Em dev, o cookie de `localhost` vale para qualquer porta. Verificar
  as duas situações na tarefa de verificação.
- [Arquivo de 5 MB em memória por requisição.] → Instância única e volume de
  TCC. O `files: 1` do multer impede vários arquivos por requisição.
- [Falha ao apagar a imagem anterior deixa um objeto sem dono.] → Só log de
  erro. O volume é pequeno, e uma limpeza pode entrar em
  `docs/PENDENCIAS.md` se aparecer na prática.
- [Cadastro anônimo pode gravar arquivo antes de o cadastro falhar.] → O
  upload só acontece depois da validação e da unicidade, e a compensação
  apaga o arquivo. O caminho de ataque é o mesmo de hoje (cadastrar contas),
  limitado pelos 5 MB.
- [`BETTER_AUTH_URL` errado no ambiente gera URLs de imagem quebradas.] → A
  variável já é obrigatória para o login funcionar, então um erro nela
  aparece antes.
- [`multipart` muda o contrato de `POST /establishments` e
  `POST /beneficiary-entities`.] → O único cliente é o frontend, que muda na
  mesma change. O Scalar passa a documentar o formulário.

## Migration Plan

1. Sem migration de banco.
2. Antes do merge na `develop`: no Coolify do staging, definir
   `MINIO_ENDPOINT` (URL interna do MinIO), `MINIO_ACCESS_KEY`,
   `MINIO_SECRET_KEY` e `MINIO_BUCKET=foodshare-staging`. O bucket é criado
   na subida.
3. Os dados do MVP com URL externa em `user.image` são limpos pela dupla, à
   parte (proposta). Até lá, essas imagens aparecem quebradas, com o ícone de
   "sem imagem" nas telas que já têm fallback.
4. Rollback: reverter o merge. As chaves gravadas em `user.image` ficam no
   banco, e o frontend antigo só mostraria imagem quebrada, sem erro de API.
