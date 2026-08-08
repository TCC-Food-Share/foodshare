## Why

Estabelecimento precisa criar conta pra usar plataforma (postar alimento, receber pedido). Sem cadastro, nenhum outro fluxo do MVP (RF10+) funciona. RF01 exige coleta de dados pessoais (usuário responsável), institucionais e endereço num único cadastro.

## What Changes

- Endpoint público de cadastro de estabelecimento (`POST /estabelecimentos`), criando em uma transação: `Usuario` (papel "Estabelecimento"), `Endereco` e `Estabelecimento`.
- Validação de formato/obrigatoriedade dos campos recebidos (nome, e-mail, celular, senha, razão social, CNPJ, e-mail institucional, celular institucional, descrição, endereço) — formato apenas; unicidade (RF02) fica pra outra change.
- Senha armazenada com hash (RNF08) — nunca em texto puro.
- Seed do papel "Estabelecimento" em `Papel` (dado de referência necessário pra FK `Usuario.idPapel`).
- **Escopo desta change é só backend.** Sem tela/formulário de cadastro no frontend — fica pra change própria depois que o endpoint existir.

## Capabilities

### New Capabilities
- `estabelecimentos/cadastro`: cadastro de estabelecimento com dados pessoais, institucionais e de endereço (RF01).

### Modified Capabilities
(nenhuma — não há specs existentes)

## Impact

- **Backend**: novo módulo `estabelecimentos/` (NestJS) — controller, service, DTOs de entrada/validação; usa `Papel`, `Usuario`, `Endereco`, `Estabelecimento` já definidos em `prisma/schema.prisma`.
- **Banco**: nenhuma alteração de schema; requer seed do registro "Estabelecimento" em `Papel`.
- **Frontend**: fora desta change — nenhum código de UI será criado agora.
- **Fora desta change**: unicidade de CNPJ/e-mail/celular (RF02), login (RF07-09), edição de cadastro (RF05-06) — cada um vira change própria.
