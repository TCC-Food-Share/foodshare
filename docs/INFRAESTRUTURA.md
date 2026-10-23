# Infraestrutura

## Regra geral

Toda solução de infraestrutura deve rodar em Docker + Coolify self-hosted, na
VPS Oracle Cloud (ARM64). Não proponha serviços gerenciados de terceiros
(banco, storage, hosting, fila) como alternativa "mais simples": essa
decisão já foi tomada. As exceções aprovadas são o **Resend** (e-mail) e o
**WhatsApp** (via n8n self-hosted).

## Ambientes

| Ambiente                | Onde                                      | Branch              | Domínios                                                                            |
| ----------------------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| Local (cada dev)        | PostgreSQL e MinIO via Docker             | qualquer            | `localhost:5173` (front), `localhost:3000` (API)                                    |
| Staging (compartilhado) | VPS Oracle + Coolify                      | `develop`           | `app.staging.foodshare.com.br`, `api.staging.foodshare.com.br`                      |
| Produção                | VPS Oracle + Coolify (ambiente já criado) | `main`              | `app.foodshare.com.br`, `api.foodshare.com.br`. A ativação é a última fase do plano |
| Landing page            | Coolify, deploy separado (Astro)          | repo `landing-page` | `foodshare.com.br`. Fora deste repositório                                          |

- Deploy automático por push. O `prisma migrate deploy` roda como comando de
  pré-deploy, e o seed roda depois dele (é idempotente).
- Nixpacks fixado em Node 22.13.1.
- O monitoramento é feito pelo Gatus (API, App e Landing Page), com alertas por
  e-mail (Resend) e WhatsApp (n8n). Endpoint novo que precise de
  monitoramento: avisar, para ser incluído no Gatus.

## Frontend ↔ API (origens)

O front e a API ficam em subdomínios distintos do mesmo site
(`foodshare.com.br`). CORS e cookie entre subdomínios já estão no código
(change `deploy-cross-origin`).

- `TRUSTED_ORIGINS` (lista separada por vírgula) alimenta o originCheck do
  better-auth **e** o CORS do NestJS.
- `COOKIE_DOMAIN` (com ponto inicial) faz o cookie de sessão valer nos dois
  subdomínios. Vazio = cookie só do host (dev).
- O cookie vai com `secure` quando `BETTER_AUTH_URL` é `https://`, então
  staging e produção **precisam** servir HTTPS.
- Em dev, o proxy do Vite (`server.proxy`) deixa front e API na mesma
  origem; nada disso entra em jogo.

## Armazenamento de imagens (MinIO)

- A API S3 do MinIO (porta 9000) não tem domínio público. No staging, o
  Service Stack do Coolify 4.1.2 não gera as labels do Traefik para ela. O
  backend acessa o MinIO **só pela rede interna do Docker**, pelo nome do
  container com o uuid da stack (`MINIO_ENDPOINT=http://minio-<uuid>:9000`,
  com protocolo e porta). O nome aparece no Terminal da stack no Coolify.
- **Nunca usar `http://minio:9000`.** `minio` é o nome do serviço em toda
  stack de MinIO, e na rede compartilhada do Coolify o Docker distribui as
  conexões entre todos eles. Já aconteceu: o staging gravou imagens no MinIO
  de produção. Para conferir, no terminal da API,
  `node -e "require('dns').lookup(new URL(process.env.MINIO_ENDPOINT).hostname,{all:true},(e,a)=>console.log(e||a))"`
  tem que devolver um único IPv4.
- Cada ambiente tem o seu MinIO e a sua chave de acesso. A chave de um
  ambiente não existe no MinIO do outro, para que um endereço errado vire
  erro de acesso, e não gravação no lugar errado.
- Só o **Console** do MinIO (interface web, porta 9001) tem domínio público
  no staging: `minio.staging.foodshare.com.br`. Ele serve para criar bucket e
  chaves de acesso, não como `MINIO_ENDPOINT`: qualquer caminho nele devolve
  a página do console. O login fica exposto na internet, então o usuário
  raiz precisa de senha forte.
- Cliente: `@aws-sdk/client-s3` com `forcePathStyle: true` (API compatível
  com S3). Assim, trocar de storage S3 no futuro é só configuração.
- **Upload junto do recurso:** não existe rota de upload separada. O
  cadastro ou a edição que tem imagem recebe `multipart/form-data`, com o
  arquivo no campo `image` e os demais dados como campos de texto (objetos
  aninhados com colchetes: `address[street]`). O decorator `@ImageUpload()`
  (`files/`) aplica o limite de 5 MB e o `ImageFilePipe` confere o tipo real
  do arquivo pelos primeiros bytes (JPEG, PNG ou WebP), não pela extensão
  (RN41). Erros: `400` com `code` `IMAGE_REQUIRED`, `IMAGE_TOO_LARGE` ou
  `IMAGE_INVALID_TYPE`.
- O backend só grava no MinIO depois de validar os dados, gera a chave
  (`users/<uuid>.<ext>`; a pasta `foods` entra com o cadastro de alimento) e
  apaga o arquivo se a operação falhar depois. Na troca, a imagem anterior é
  apagada depois do commit.
- **Leitura:** `GET /files/:folder/:name` no backend, que busca o objeto e
  devolve o arquivo com `Content-Type` e
  `Cache-Control: private, max-age=31536000, immutable` (a chave nunca é
  reaproveitada, então o arquivo de uma chave nunca muda). A rota exige
  sessão, como todo o sistema. As respostas da API montam a URL a partir do
  `BETTER_AUTH_URL`.
- O banco guarda só a chave (`docs/MODELO-DE-DADOS.md`, "Imagens").
- Um único bucket por ambiente, privado. O backend cria o bucket na subida
  se ele não existir; com o MinIO fora do ar, só registra erro e a API sobe
  mesmo assim.
- **Limpar o bucket:** `npm run storage:clear` (em `backend/`) apaga todos os
  objetos do `MINIO_BUCKET` configurado. Pede para digitar o nome do bucket
  como confirmação; `-- --force` pula a pergunta. Usar junto do
  `prisma migrate reset`, senão sobram arquivos sem dono no bucket e chaves
  quebradas no banco.

## E-mail (Resend)

- O domínio `foodshare.com.br` já está verificado no Resend.
- **Uso único:** o código de recuperação de senha (RF08). O plano gratuito
  tem limite baixo, então nenhum outro e-mail sai do sistema (RN45).
- Remetente: `EMAIL_FROM`, ex.: `Food Share <nao-responda@foodshare.com.br>`.
- O envio é disparado sem `await` dentro do `sendVerificationOTP` do
  better-auth. Falha de envio gera log de erro.
- O mesmo Resend já é usado como SMTP dos alertas do Gatus. Isso consome a
  mesma cota.

## WhatsApp (n8n)

- O backend **não** fala com nenhum provedor de WhatsApp. Ele chama um
  webhook do n8n self-hosted, e o fluxo no n8n envia a mensagem (RNF17).
- Chamada: `POST N8N_WEBHOOK_URL` com header
  `X-Webhook-Secret: N8N_WEBHOOK_SECRET` (o fluxo no n8n recusa sem ele) e
  corpo:

  ```json
  {
    "kind": "ENTITY_DAY_3",
    "phone": "5518999999999",
    "institutionName": "Lar Esperança",
    "foodName": "Arroz",
    "quantity": "10",
    "unit": "kg",
    "orderId": 123,
    "orderUrl": "https://app.foodshare.com.br/pedidos/123"
  }
  ```

  O texto da mensagem fica no n8n, não no backend.

- O telefone vai em formato internacional, só dígitos (`55` + DDD + número).
  É a mesma conversão do link `wa.me` (RF09); uma função única no backend
  faz as duas.
- Timeout curto (5 s) e nenhuma nova tentativa na mesma execução. Se a
  chamada falhar, a tarefa do dia seguinte tenta de novo, porque o lembrete
  só é gravado em `order_reminder` depois de sucesso (RN42).
- **`N8N_WEBHOOK_URL` vazio = lembretes desligados.** É o estado padrão até
  existir o número dedicado (pendência P01 em `docs/REQUISITOS.md`).
- Para testar sem número, usar um fluxo de teste no n8n que só registra o
  payload.

## Tarefas agendadas

- `@nestjs/schedule`, num módulo próprio (`jobs/`).
- **Uma tarefa diária às 08:00 (`America/Sao_Paulo`)**, nesta ordem:
  1. Expiração de pedidos `Pendente` (RF72).
  2. Lembrete do estabelecimento, 5º dia (RF74).
  3. Lembretes da entidade, 3º e 7º dia (RF73).

  Os dias são contados em dias corridos a partir de `orderDate` (pendentes)
  ou `acceptedAt` (em andamento). Às 08:00 a mensagem chega em horário
  comercial.

- As tarefas são idempotentes e assumem **uma única instância** do backend
  por ambiente (é o caso hoje). Se um dia houver réplicas, a tarefa precisa
  de trava (ex.: advisory lock do Postgres) antes de escalar.
- Para testar sem esperar o horário, as tarefas também ficam acessíveis por
  uma rota de administrador: `POST /admin/jobs/:name/run`.

## Variáveis de ambiente

### Backend

| Variável                                                       | Dev                                          | Staging / Produção                                                                                               | Uso                             |
| -------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `DATABASE_URL`                                                 | Postgres local                               | Postgres do Coolify                                                                                              | Prisma                          |
| `BETTER_AUTH_URL`                                              | `http://localhost:3000`                      | `https://api.staging.foodshare.com.br` / `https://api.foodshare.com.br`                                          | better-auth                     |
| `BETTER_AUTH_SECRET`                                           | qualquer                                     | segredo forte, diferente por ambiente                                                                            | better-auth                     |
| `TRUSTED_ORIGINS`                                              | `http://localhost:5173`                      | `https://app.staging.foodshare.com.br` / `https://app.foodshare.com.br`                                          | originCheck + CORS              |
| `COOKIE_DOMAIN`                                                | _(vazio)_                                    | `.staging.foodshare.com.br` / `.foodshare.com.br`                                                                | cookie entre subdomínios        |
| `FRONTEND_URL`                                                 | `http://localhost:5173`                      | URL do app no ambiente                                                                                           | links nas mensagens de WhatsApp |
| `MINIO_ENDPOINT`                                               | `http://localhost:9000`                      | URL interna da API S3 na rede Docker, com protocolo e porta, pelo nome do container (`http://minio-<uuid>:9000`) | upload/leitura                  |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`                        | do container local                           | do recurso no Coolify, diferente por ambiente                                                                    | upload/leitura                  |
| `MINIO_BUCKET`                                                 | `foodshare-dev`                              | `foodshare-staging` / `foodshare`                                                                                | upload/leitura                  |
| `RESEND_API_KEY`                                               | chave de teste                               | chave do Resend                                                                                                  | e-mail                          |
| `EMAIL_FROM`                                                   | `Food Share <nao-responda@foodshare.com.br>` | idem                                                                                                             | e-mail                          |
| `N8N_WEBHOOK_URL`                                              | _(vazio ou fluxo de teste)_                  | _(vazio até P01)_                                                                                                | lembretes                       |
| `N8N_WEBHOOK_SECRET`                                           | qualquer                                     | segredo forte                                                                                                    | lembretes                       |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | dev                                          | definidos no Coolify                                                                                             | primeiro administrador (seed)   |

Toda variável nova entra no `backend/.env.example`, com comentário curto
dizendo para que serve. Nenhum segredo vai para o repositório.

O seed carrega a instância do better-auth para criar o primeiro
administrador, então precisa de `DATABASE_URL`, `JWT_SECRET` e
`BETTER_AUTH_URL` no ambiente onde roda, além das `SEED_ADMIN_*`. Sem as
`SEED_ADMIN_*`, ele só pula esse passo com um aviso.

### Frontend

| Variável       | Dev                    | Staging / Produção                                                      |
| -------------- | ---------------------- | ----------------------------------------------------------------------- |
| `VITE_API_URL` | `/api` (proxy do Vite) | `https://api.staging.foodshare.com.br` / `https://api.foodshare.com.br` |

## Frontend: detalhe de build

O frontend usa `vite@^7` com `@vitejs/plugin-react@^5`. As versões novas
(`vite@^8` / `@vitejs/plugin-react@^6`) têm um bug no binário nativo do
Rolldown no build ARM64 da VPS. **Não atualize essas duas dependências** sem
antes validar o build ARM64 no Coolify.

O mesmo cuidado vale para qualquer dependência nova com binário nativo:
confirme que ela tem build para `linux-arm64` antes de adicionar.
