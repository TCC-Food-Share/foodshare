## Why

O RF01 e o RF02 exigem imagem no cadastro das instituições, e o RF03 permite
trocá-la na edição. Hoje não existe upload: o cadastro não recebe imagem e a
edição aceita só uma URL digitada (resto do MVP). O RNF09 e a RN41 pedem que
as imagens fiquem num servidor seguro (o MinIO do próprio ambiente), com
limite de 5 MB e formatos JPEG, PNG ou WebP. As changes de alimento (2.1) e de
administradores (5.1) dependem dessa base, por isso ela entra agora (item 0.3
de `docs/PLANO-IMPLEMENTACAO.md`).

## What Changes

- **Backend — módulo `files`:** cliente S3 (`@aws-sdk/client-s3`) apontado
  para o MinIO pela rede interna. Um serviço único valida a imagem (até 5 MB,
  tipo real JPEG/PNG/WebP conferido pelo conteúdo, não pela extensão), gera a
  chave (`users/<uuid>.<ext>`), grava e apaga objetos.
- **Backend — leitura:** `GET /files/<chave>` devolve o arquivo com
  `Content-Type` e cache longo. Exige sessão, como o resto do sistema.
- **Backend — URL nas respostas:** o banco guarda só a chave. As respostas
  que trazem a imagem do usuário (`/establishments/me`,
  `/beneficiary-entities/me`, `GET /me` e as respostas de cadastro e edição)
  passam a devolver a URL completa da rota `/files/...`.
- **Backend — cadastro com imagem (decidido nesta proposta):**
  `POST /establishments` e `POST /beneficiary-entities` passam a receber
  `multipart/form-data`, com os dados e a imagem obrigatória na mesma
  requisição. O arquivo só vai para o MinIO depois de os dados passarem na
  validação. Se o cadastro falhar depois do upload, o objeto é apagado.
  **BREAKING:** o corpo JSON deixa de ser aceito sem imagem. O único cliente é
  o nosso frontend, que muda junto.
- **Backend — troca de imagem na edição (decidido nesta proposta):**
  `PATCH /establishments/me` e `PATCH /beneficiary-entities/me` aceitam a
  imagem como arquivo opcional na mesma requisição. O campo `image` como texto
  (URL) deixa de existir. A imagem anterior é apagada do MinIO depois do commit.
- **Sem `POST /files` (decidido nesta proposta):** em vez de um upload
  separado que devolve a chave, cada recurso recebe o próprio arquivo. Não
  sobra objeto órfão e o backend nunca precisa confiar numa chave vinda do
  cliente. A 2.1 (alimento) e a 5.1 (administrador) seguem o mesmo padrão.
- **Frontend — componente de upload:** reutilizável, com prévia, troca do
  arquivo e erro de tamanho/tipo antes de enviar.
- **Frontend — cadastro:** o wizard volta a ter a etapa "Foto de perfil",
  obrigatória, e passa de 4 para 5 etapas.
- **Frontend — perfil:** o campo "URL da imagem/logotipo" vira o componente
  de upload.
- **Configuração:** `MINIO_ENDPOINT` (URL), `MINIO_ACCESS_KEY`,
  `MINIO_SECRET_KEY` e `MINIO_BUCKET` no `backend/.env.example`, conforme
  `docs/INFRAESTRUTURA.md`. Sai o `MINIO_PORT`, que nada usa.
- **Docs:** `docs/INFRAESTRUTURA.md` e `docs/PLANO-IMPLEMENTACAO.md` trocam o
  `POST /files` pelo upload junto do recurso.

## Cobertura

- **RF01, RF02** — imagem obrigatória no cadastro de estabelecimento e de
  entidade beneficiária.
- **RF03** — troca da imagem na edição do próprio cadastro (só a imagem; os
  demais ajustes do RF03 ficam na 4.2).
- **RNF09** — limite de 5 MB e armazenamento no MinIO do ambiente, sem acesso
  público.
- **RN41** — 5 MB, JPEG/PNG/WebP, só a chave no banco.

## Fora desta change

- Imagem de alimento: upload no cadastro e na edição, e o fim do campo de URL
  do alimento (2.1). Até lá, `food.image` continua como está, inclusive na
  resposta.
- Os outros campos que o RF03 torna editáveis (nome fantasia, nome do
  responsável): 4.2.
- Imagem do administrador (RF29, RF30): 5.1.
- Exclusão permanente apagando o objeto no MinIO (RF31, RF45, RF46, RF51):
  nas changes dessas exclusões.
- Imagem nos perfis públicos e na listagem de instituições (RF10, RF12, RF13):
  4.3. A rota de leitura daqui já atende.
- Conversão de dados do MVP: as imagens antigas guardam URLs externas. A dupla
  limpa esses dados à parte, e esta change não trata URL antiga como caso
  válido.
- Redimensionamento, compressão ou recorte da imagem: nenhum RF pede.

## Perguntas em aberto

- **Instituições já cadastradas sem imagem.** A obrigatoriedade vale para o
  cadastro (RF01, RF02). Nenhum RF manda exigir a imagem de quem já existe.
  Proposta: a edição não obriga a enviar imagem, e as telas mantêm o ícone de
  "sem imagem" quando ela falta.

## Capabilities

### New Capabilities

- `arquivos/imagens`: validação (tamanho e tipo real), armazenamento no
  MinIO, chave no banco, rota de leitura com sessão, URL nas respostas e o
  componente de upload do frontend.

### Modified Capabilities

- `estabelecimentos/cadastro`: imagem obrigatória na submissão, e o cadastro
  atômico passa a incluir o objeto no MinIO.
- `estabelecimentos/edicao-cadastro`: a imagem é enviada como arquivo, não
  como URL, e a anterior é apagada após a troca.
- `entidades-beneficiarias/cadastro`: idem ao estabelecimento.
- `entidades-beneficiarias/edicao-cadastro`: idem ao estabelecimento.

## Impact

- **Schema:** nenhuma mudança. `User.image` (`VarChar(500)`, opcional) passa
  a guardar a chave. A obrigatoriedade fica no cadastro (DTO/interceptor),
  como diz `docs/MODELO-DE-DADOS.md`.
- **Backend:** módulo novo `files/`. `establishments` e `beneficiary-entities`
  (controllers, services, DTOs de cadastro e edição, `toResponse`).
  `app.controller.ts` (`GET /me`). Dependências novas: `@aws-sdk/client-s3`
  e `@types/multer` (dev). As duas são JavaScript puro, sem binário nativo,
  então funcionam no ARM64. A detecção do tipo pelo conteúdo é código
  próprio (design, D4).
- **Frontend:** `features/auth/sign-up` (etapa nova, schema, envio em
  `FormData`), `features/profile` (formulário, schema, envio),
  `lib/api.ts` (aceitar `FormData`), componente novo de upload.
- **Ambientes:** variáveis do MinIO no Coolify do staging (rede interna) e o
  bucket `foodshare-staging`. O backend cria o bucket na subida se ele não
  existir.
- **API:** cadastro e edição das instituições passam a usar
  `multipart/form-data`. Rota nova `GET /files/:folder/:name`. O Gatus não
  precisa monitorar a rota de arquivo.
