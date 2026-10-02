## Why

Entidade beneficiária precisa criar conta pra usar plataforma (solicitar pedido, receber doação). Sem cadastro, nenhum fluxo do MVP que depende dela (RF15+) funciona. RF03 exige coleta de dados pessoais (usuário responsável), institucionais e endereço num único cadastro — mesmo padrão do cadastro de estabelecimento (RF01).

## What Changes

- Endpoint público de cadastro de entidade beneficiária (`POST /entidades-beneficiarias`), criando em uma transação: `Usuario` (papel "EntidadeBeneficiaria"), `Endereco` e `EntidadeBeneficiaria`.
- Validação de formato/obrigatoriedade dos campos recebidos (nome, e-mail, celular, senha, razão social, CNPJ, e-mail institucional, celular institucional, descrição, endereço) — formato apenas; unicidade (RF04) fica pra outra change.
- Senha armazenada com hash (RNF08) — nunca em texto puro.
- Seed do papel "EntidadeBeneficiaria" em `Papel` (dado de referência necessário pra FK `Usuario.idPapel`).
- **Escopo desta change é só backend.** Sem tela/formulário de cadastro no frontend — fica pra change própria depois que o endpoint existir.

## Capabilities

### New Capabilities
- `entidades-beneficiarias/cadastro`: cadastro de entidade beneficiária com dados pessoais, institucionais e de endereço (RF03).

### Modified Capabilities
(nenhuma — não há specs existentes pra entidade beneficiária)

## Impact

- **Backend**: novo módulo `entidades-beneficiarias/` (NestJS) — controller, service, DTOs de entrada/validação; usa `Papel`, `Usuario`, `Endereco`, `EntidadeBeneficiaria` já definidos em `prisma/schema.prisma`. Reaproveita `PrismaService` já existente (criado na change de cadastro de estabelecimento).
- **Banco**: nenhuma alteração de schema; requer seed do registro "EntidadeBeneficiaria" em `Papel`.
- **Frontend**: fora desta change — nenhum código de UI será criado agora.
- **Fora desta change**: unicidade de CNPJ/e-mail/celular (RF04), login (RF07-09), edição de cadastro (RF05-06) — cada um vira change própria.
