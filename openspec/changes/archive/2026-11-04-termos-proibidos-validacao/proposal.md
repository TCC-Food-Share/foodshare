## Why

A tabela de termos proibidos já existe e é gerenciada pelo painel (1.1 e 1.3), mas nada a consulta: descrição, observações e nome fantasia aceitam qualquer texto, inclusive ofensas e links. O RNF07 exige esse bloqueio, com a lista configurável pela equipe administrativa, sem novo deploy.

## What Changes

- Nova validação de texto livre no backend, aplicada por decorator nos DTOs:
  - recusa os termos da tabela `prohibited_term`, sem diferenciar maiúsculas nem acentos, comparando **palavra inteira**;
  - recusa links e domínios por regex (`https://`, `www.`, `site.com.br`, `instagram.com/x`), o que inclui e-mails, por conterem domínio.
- A lista de termos é lida do banco a cada validação: um termo cadastrado ou excluído no painel vale na requisição seguinte.
- Texto recusado responde `400` com `code: PROHIBITED_CONTENT` e `fields` com os campos recusados. A resposta não diz qual termo casou.
- Campos cobertos agora:
  - descrição do estabelecimento e da entidade (cadastro e edição);
  - nome fantasia (cadastro);
  - descrição e observações do alimento (cadastro).
- O frontend mostra o erro no próprio campo, no cadastro de instituição (voltando para a etapa do campo), na edição de perfil e no cadastro de alimento.
- As decisões que os documentos não cobriam viram a **DT24** em `docs/REQUISITOS.md`.

**Cobre:** RNF07 (com RF01, RF02 e RF14 como campos validados), usando a lista de RF67–RF70, RN37 e DT10.

### Fora desta change

- Texto da sugestão: a rota nasce na 1.5 (`sugestoes`), que aplica o decorator.
- Nome fantasia na edição: o campo só passa a ser editável na 4.2 (`perfil-completo`), que aplica o decorator.
- Formulários do painel que recebem esses mesmos textos: 5.2 (`admin-instituicoes`) e 5.4 (`admin-alimentos`).
- CRUD dos termos: já entregue na 1.3.

### Fora de propósito (DT24)

- Razão social, nome do responsável e endereço não são validados.
- Telefone e `@perfil` no texto não são bloqueados.
- Grafias disfarçadas (`p.u.t.a`, `site . com`) e variações não cadastradas (`merdas`) passam.
- Textos já gravados não são revisados nem removidos.

## Capabilities

### New Capabilities

- `moderacao/textos-livres`: validação dos textos livres contra termos proibidos e links, formato do erro e exibição no campo.

### Modified Capabilities

Nenhuma. As regras de cadastro e edição continuam valendo; a nova spec acrescenta uma recusa sem alterar os requisitos existentes.

## Impact

- **Backend:** novo módulo `content-moderation/`; `ValidationPipe` global trocado por uma subclasse que traduz a recusa em `PROHIBITED_CONTENT`; `useContainer` do `class-validator` em `main.ts`, para o validador acessar o banco; decorator nos DTOs de estabelecimento, entidade e alimento; documentação `@ApiBadRequestResponse` das rotas afetadas.
- **Frontend:** helper de erro e tratamento em `sign-up-page.tsx`, `profile-page.tsx` e `create-food-dialog.tsx`.
- **Banco:** sem migration. Uma leitura de `prohibited_term` por campo validado.
- **Docs:** DT24 em `docs/REQUISITOS.md`, regra em `docs/CONVENCOES.md` e lembretes nos itens 1.5, 4.2, 5.2 e 5.4 de `docs/PLANO-IMPLEMENTACAO.md`.
- **Dependências:** nenhuma nova.

## Perguntas em aberto

Nenhuma. Comparação por palavra inteira, bloqueio de links e domínios e lista de campos do plano foram confirmados na proposta.
