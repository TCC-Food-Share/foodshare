## Why

Hoje estabelecimentos e entidades beneficiárias só definem contato, imagem, descrição e endereço uma vez, no cadastro (RF01/RF03). Sem uma forma de editar esses dados depois, qualquer mudança de telefone, endereço, foto/logo ou descrição da instituição fica sem solução dentro da plataforma — RF05 cobre essa lacuna.

## What Changes

- Endpoint autenticado para o estabelecimento editar seus próprios dados cadastrais editáveis: celular pessoal, celular institucional, e-mail institucional, imagem, descrição e endereço (CEP, logradouro, número, complemento, cidade, estado).
- Endpoint autenticado para a entidade beneficiária editar o mesmo conjunto de dados cadastrais editáveis.
- Validação de formato dos campos enviados (mesmas regras de formato usadas no cadastro), rejeitando a edição inteira se algum campo for inválido.
- Endereço atualizado como unidade só: os seis campos de endereço são substituídos juntos quando o endereço faz parte da edição.
- Fora do escopo deste change (não implementado agora): edição de e-mail pessoal, CNPJ e razão social (RF06 trava esses campos, tratado em change futuro); edição de nome do responsável e nome fantasia (não estão na lista de "contato, imagem, descrição e endereço" do RF05); reenvio de dados sensíveis como senha por este endpoint.

## Capabilities

### New Capabilities
- `estabelecimentos/edicao-cadastro`: permite ao estabelecimento autenticado editar contato, imagem, descrição e endereço do próprio cadastro.
- `entidades-beneficiarias/edicao-cadastro`: permite à entidade beneficiária autenticada editar contato, imagem, descrição e endereço do próprio cadastro.

### Modified Capabilities
- (nenhuma — `estabelecimentos/cadastro` e `entidades-beneficiarias/cadastro` cobrem a criação do cadastro; a edição é um fluxo novo, sem alterar os requisitos de criação já especificados)

## Impact

- Backend: novo endpoint (`PATCH /establishments/me`, `PATCH /beneficiary-entities/me`) nos módulos `establishments/` e `beneficiary-entities/`, com DTO de edição restrito aos campos editáveis (whitelist), guard de autenticação e atualização atômica de `User`/`Address`/`Establishment` ou `User`/`Address`/`BeneficiaryEntity` via Prisma.
- Frontend: tela/formulário de edição de perfil para cada tipo de conta, reutilizando os campos de contato/imagem/descrição/endereço já validados no cadastro.
- Banco de dados: nenhuma alteração de schema — os campos editados já existem em `User`, `Address`, `Establishment` e `BeneficiaryEntity`.
