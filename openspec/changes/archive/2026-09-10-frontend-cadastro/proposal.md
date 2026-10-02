## Why

O F0 entregou a plumbing de sessão do frontend e um placeholder na rota
`/cadastro`; o F1 entregou a tela de login. RF01–RF04 já estão completos e
testados no backend (specs `estabelecimentos/cadastro`,
`entidades-beneficiarias/cadastro` e `mensagem-generica-duplicidade-cadastro`),
mas **não existe tela de cadastro** — quem ainda não tem conta não consegue
entrar na plataforma por nenhum caminho, e todo o funil de aquisição
(estabelecimento e entidade) está bloqueado. O F2 constrói o formulário
multi-etapa de cadastro e fecha a porta de entrada da aplicação.

## What Changes

- **Rota `/cadastro`** (pública): substitui o `RoutePlaceholder` do F0 por uma
  `SignUpPage` real — um wizard de 4 etapas. Se o usuário já estiver
  autenticado, redireciona para `/feed`.
- **Layout de painel duplo compartilhado**: extrai da `LoginPage` (F1) um
  `AuthLayout` (painel de marca à esquerda + área de conteúdo à direita) e
  reaproveita em `/login` e `/cadastro`. O F1 adiou explicitamente essa
  extração para "quando existir a segunda tela que a justifique" (design F1,
  decisão 1) — é agora.
- **Wizard de 4 etapas**, rascunho mantido em memória (`useState`) durante a
  navegação entre passos; cada passo valida os próprios campos (`zod` +
  `react-hook-form`) antes de liberar o "Continuar" (RNF06). Etapas alinhadas
  ao DTO do backend (o protótipo Pencil está incompleto — falta a etapa do
  responsável):
  1. **Tipo de perfil** — Estabelecimento | Entidade beneficiária (cartões de
     rádio). Define para qual endpoint o cadastro vai.
  2. **Dados institucionais** — `companyName` (razão social), `tradeName`
     (nome fantasia, opcional), `cnpj`, `institutionalEmail`,
     `institutionalPhone`, `description`.
  3. **Dados do responsável** — `name`, `email` (e-mail de login),
     `personalPhone`, `password` + confirmação (a confirmação é só do
     frontend; o backend recebe só `password`).
  4. **Endereço** — `postalCode`, `street`, `number`, `complement` (opcional),
     `city`, `state` (UF). Uma vez só.
- **Submissão**: no "Finalizar cadastro" da etapa 4, `POST /api/establishments`
  **ou** `POST /api/beneficiary-entities` conforme a etapa 1, com o corpo achatado
  do DTO (`address` aninhado). **Não** é `sign-up` do better-auth.
- **RF02/RF04 — duplicidade (`409`)**: o backend responde
  `{ message, fields: [...] }` com `fields` em
  `{ cnpj, institutionalEmail, institutionalPhone, personal }`. O frontend
  mapeia para mensagens em pt-BR: identifica explicitamente CNPJ / e-mail
  institucional / celular institucional, e usa **uma indicação genérica** para
  `personal` ("um dado pessoal — e-mail ou celular — já está cadastrado"), sem
  dizer qual — mesmo critério anti-enumeração da change
  `mensagem-generica-duplicidade-cadastro`. O usuário volta para a etapa do
  campo apontado.
- **Sucesso**: o cadastro **não** emite sessão (o backend cria o usuário via
  `auth.api.signUpEmail`, mas o `Set-Cookie` não é repassado na resposta HTTP
  do nosso controller). Em `201`, redireciona para `/login` com um toast de
  sucesso ("Conta criada. Entre com seu e-mail e senha.").
- **Schemas zod espelham o `class-validator` do backend**: telefone
  `/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/`, CNPJ
  `/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/`, CEP `/^\d{5}-?\d{3}$/`, UF duas
  letras maiúsculas, senha 8–72, e-mail, `maxLength` de cada campo.
- **Novos componentes shadcn/ui**: `radio-group` (cartões da etapa 1) e um
  indicador de progresso do wizard (`progress` ou passo-a-passo). Sem
  `checkbox` — a etapa "Categorias de alimentos" do protótipo sai.
- **Protótipo Pencil** (`~/IFSP/Downloads/updated/pencil-design-apresentacao.pen`),
  ajustes por estar fora do escopo / desalinhado com o backend:
  - **Remover** a etapa "Categorias de alimentos" (entidade escolhendo
    categorias) — não é RF.
  - **Remover** o campo "Nome de perfil" — a identidade pública é razão social
    / nome fantasia.
  - **Remover** a etapa "Foto de perfil" — ver "Impact".
  - **Separar** o campo único "Rua, número, complemento" em `street` / `number`
    / `complement`; remover o endereço duplicado entre etapas.
  - Trocar o texto "ConectaFood" (subtítulo da etapa "Perfil na plataforma")
    por "Food Share".
  - Atualizar o rótulo "Etapa X de 4" para refletir as 4 etapas reais desta
    change (o protótipo rotula "de 4" mas só desenha 3).
  - O botão de toggle de tema (canto superior direito) **não vira código** —
    sem RF, tema de usuário adiado no F0 (mesma decisão do F1).

### Melhorias de entrada de dados (somadas ao escopo depois da 1ª implementação)

- **Máscara de input** em `cnpj` (`##.###.###/####-##`), `institutionalPhone` /
  `personalPhone` (`(##) ####-####` ou `(##) #####-####`, dinâmica pelo nº de
  dígitos) e `postalCode` (`#####-###`), via `@react-input/mask`. O valor
  **mascarado** (com pontuação) é o que fica no form e vai no payload — os regex
  do backend já aceitam com ou sem pontuação. Passa a ser o padrão para campos
  formatados em F3, F5 e demais formulários.
- **Autopreenchimento por CEP (ViaCEP)**: ao sair do campo CEP com 8 dígitos,
  `GET https://viacep.com.br/ws/{cep}/json/` preenche `street` (logradouro),
  `city` (localidade) e `state` (uf), e move o foco para `number`. CEP
  inexistente (`{ erro: true }`) → não preenche nada, mostra uma dica discreta,
  usuário segue à mão. `fetch` direto (API pública, sem credencial), não o
  `lib/api`.
- **Cidade vira autocomplete**: ao escolher a UF (ou quando o ViaCEP a define),
  carrega os municípios daquela UF em
  `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`
  (cache em memória por UF) e sugere enquanto o usuário digita. Aceita o valor
  digitado (backend valida só `maxLength`), mas prioriza casar com a lista.
- **Toasts no tema Food Share**: o `<Toaster>` do `sonner` (montado no
  `main.tsx`) passa a renderizar **todo** toast com fundo azul (`--primary`,
  `#1d4ed8`) e texto/ícones em branco (`--primary-foreground`). Vale para o app
  inteiro, não só o cadastro.

## Capabilities

### New Capabilities

<!-- Nenhuma. -->

### Modified Capabilities

<!-- Nenhuma. `skip_specs: true` no .openspec.yaml.

O comportamento observável de RF01–RF04 já está descrito e implementado nas
specs `estabelecimentos/cadastro`, `entidades-beneficiarias/cadastro` e
`mensagem-generica-duplicidade-cadastro` (changes `cadastro-estabelecimento`,
`cadastro-entidade-beneficiaria`, `unicidade-cadastro-estabelecimento` e
`mensagem-generica-duplicidade-cadastro`): criar o cadastro numa única
submissão atômica, hashear a senha, nunca retorná-la, e rejeitar CNPJ / e-mail /
celular duplicados com identificação explícita dos dados institucionais e
genérica dos pessoais. O F2 é a **entrega dessa mesma capability na superfície
de UI** — não muda nenhum requisito de sistema. Segue o precedente do F0
(`frontend-fundacao`) e do F1 (`frontend-login`), ambos `skip_specs`: as telas
de F1–F8 consomem specs existentes e não há capability de frontend/UI na
organização de specs do projeto. Não faz sentido inventar uma só para
satisfazer o validate. -->

## Impact

- **Frontend** (único afetado):
  - `src/app/router.tsx`: `/cadastro` deixa de renderizar
    `RoutePlaceholder feature="F2"` e passa a montar `SignUpPage`.
  - Novos arquivos em `src/features/auth/sign-up/`: página do wizard, um
    componente por etapa, schemas zod, funções de API
    (`createEstablishment`, `createBeneficiaryEntity`).
  - Novo `src/features/auth/auth-layout.tsx` (extraído da `LoginPage`);
    `login-page.tsx` refatorado para consumi-lo; `brand-panel.tsx` possivelmente
    absorvido pelo layout. Sem mudança de comportamento do login (RF07–RF09).
  - Novos `src/components/ui/radio-group.tsx` e o componente de progresso do
    wizard, com as dependências Radix correspondentes
    (`@radix-ui/react-radio-group` e, se aplicável, `@radix-ui/react-progress`).
  - Novos `src/components/ui/masked-input.tsx` (envelopa o `Input` com
    `@react-input/mask`), `src/features/auth/sign-up/city-autocomplete.tsx`,
    `src/features/auth/sign-up/viacep.ts` e `src/features/auth/sign-up/ibge.ts`.
  - `src/components/ui/sonner.tsx` alterado — `<Toaster>` com as CSS vars do
    tema Food Share (fundo azul, texto/ícones brancos).
  - Dependência nova: `@react-input/mask` (pura, sem binário nativo — sem risco
    ARM64). `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner` e
    `components/ui/{form,input,label,button,alert,textarea,select}` já vêm do F0.
- **APIs externas** (públicas, `Access-Control-Allow-Origin: *`, sem chave, via
  `fetch` direto): `viacep.com.br` (endereço por CEP) e
  `servicodados.ibge.gov.br` (municípios por UF). Sem impacto no `lib/api`
  (que continua só para a API própria com `credentials: 'include'`).
- **Backend**: nada. Os endpoints (`POST /establishments`,
  `POST /beneficiary-entities`), o formato de erro `409`
  (`{ message, fields }`) e a atomicidade já estão entregues e testados.
- **Depende de** (já em `develop`): F0 (`AuthProvider`, `useAuth`, `lib/api`,
  `components/ui/*`, tokens azuis), F1 (`LoginPage` / `BrandPanel` como origem
  do `AuthLayout`), specs de cadastro citadas acima.
- **Build**: `tsc -b && vite build` do frontend deve continuar verde (atenção
  ao ARM64 do Coolify — não subir `vite` / `@vitejs/plugin-react`).
- **Fora do escopo desta change**:
  - **Foto de perfil** — o `CreateEstablishmentDto` / `CreateBeneficiaryEntityDto`
    **não têm campo `image`** (só o `PATCH me`, como URL) e não existe endpoint
    de upload em nenhum lugar do backend. A foto de perfil fica para um change
    futuro, junto de uma história de upload de imagem (problema comum a F2 e F5).
  - Recuperação de senha, confirmação de conta por e-mail, auto-login pós-cadastro.
  - Consulta de razão social por CNPJ — nenhum RF, nenhuma dependência de backend.
  - Testes E2E automatizados (a verificação é manual via `playwright-cli`).
