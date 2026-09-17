## Why

RF05/RF06 já estão implementados no backend (`PATCH /establishments/me`, `PATCH /beneficiary-entities/me`, specs `estabelecimentos/edicao-cadastro` e `entidades-beneficiarias/edicao-cadastro`), mas **não existe tela de edição de perfil** — a rota `/perfil` ainda é o `RoutePlaceholder` do F0. Sem essa tela, estabelecimentos e entidades beneficiárias não têm nenhum caminho para atualizar contato, imagem, descrição ou endereço depois do cadastro, mesmo o backend já suportando. Falta também um gap pequeno: os dois `PATCH me` não têm um `GET` equivalente, e a tela de edição precisa carregar os dados atuais antes de exibir o formulário.

## What Changes

- **Gap de backend — leitura do próprio cadastro**: adicionar `GET /establishments/me` e `GET /beneficiary-entities/me`, cada um devolvendo o cadastro completo (mesmo formato do `PATCH me`, sem senha) do usuário autenticado, restrito à própria sessão.
- **Rota `/perfil`** (protegida, dentro do `AppShell`): substitui o `RoutePlaceholder feature="F3"` por uma `ProfilePage` real. Busca o cadastro atual (`GET .../me` conforme `role` da sessão) e renderiza um formulário de edição.
- **Formulário de edição** (`react-hook-form` + `zod`, `PATCH /establishments/me` ou `/beneficiary-entities/me` conforme a `role`):
  - **RF06**: `e-mail pessoal`, `CNPJ` e `razão social` renderizados **somente leitura**, nunca enviados no `PATCH`.
  - **RF05**: editáveis — celular pessoal, celular institucional, e-mail institucional, imagem (URL), descrição e endereço completo (CEP, logradouro, número, complemento, cidade, estado), com máscaras e autopreenchimento de CEP/cidade iguais aos do cadastro (F2).
  - Endereço enviado como unidade só (mesmas regras do backend — RF05 já validado).
- **REMOVER do protótipo Pencil** (`Desktop - Meu Perfil` / `huKcK`): seção "Zona de perigo" / "Desativar minha conta" (autoexclusão é Fora do Escopo); toggle/botão "WhatsApp".
- Fora do escopo desta change: upload de imagem (continua por URL, mesmo do F2/F5), edição de e-mail pessoal/CNPJ/razão social (RF06 trava esses campos), edição de nome do responsável e nome fantasia (fora da lista de RF05), exclusão/desativação de conta.

## Capabilities

### New Capabilities

<!-- Nenhuma. -->

### Modified Capabilities

- `estabelecimentos/edicao-cadastro`: adiciona a leitura do próprio cadastro completo (`GET /establishments/me`), pré-requisito para a edição existente poder ser exibida com os valores atuais.
- `entidades-beneficiarias/edicao-cadastro`: adiciona a leitura do próprio cadastro completo (`GET /beneficiary-entities/me`), mesmo motivo.

## Impact

- **Backend**: um `@Get('me')` novo em cada um de `EstablishmentsController` / `BeneficiaryEntitiesController`, reaproveitando `toResponse` (mesmo shape do `PATCH me`, sem senha), com `NotFoundException` se não houver cadastro vinculado à sessão (mesmo padrão do `update`).
- **Frontend**: `ProfilePage` em `src/features/profile/`, reaproveitando schemas/máscaras/ViaCEP/IBGE do cadastro (F2) e o padrão de formulário do wizard, agora numa tela única (sem etapas). `router.tsx`: `/perfil` passa a montar `ProfilePage` no lugar do `RoutePlaceholder`.
- **Banco de dados**: nenhuma alteração de schema — os dois `GET` só leem entidades já existentes.
- **Depende de**: F0 (`AuthProvider`, `lib/api`, `AppShell`), F2 (`masked-input`, `viacep.ts`, `ibge.ts`, `city-autocomplete.tsx` — candidatos a reuso), specs `estabelecimentos/edicao-cadastro` e `entidades-beneficiarias/edicao-cadastro` já implementadas.
