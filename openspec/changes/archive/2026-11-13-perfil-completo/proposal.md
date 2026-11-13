## Why

A edição de perfil do MVP só deixa a instituição trocar contatos, imagem, descrição e endereço. O RF03 da versão
final pede também o **nome fantasia**, o **celular pessoal** e o **nome do responsável**, mantendo somente leitura o
e-mail pessoal, o CNPJ e a razão social (RN27). Hoje o backend recusa o nome fantasia e o nome do responsável como
campos não editáveis, e a tela mostra os dois com cadeado. É o item 4.2 do plano, que depende só da 0.3 (já em
`develop`), e destrava a 4.3 (`instituicoes-e-perfil-publico`), em que o nome fantasia passa a ser o nome público da
instituição (RN36).

## What Changes

### Backend (`PATCH /establishments/me` e `PATCH /beneficiary-entities/me`)

- O corpo da edição passa a aceitar `tradeName` (nome fantasia) e `name` (nome do responsável), em qualquer
  combinação com os campos que já eram editáveis. O `personalPhone` já era aceito e continua igual.
- `tradeName` usa `@NoProhibitedContent()` (RNF07, DT24), com o mesmo limite do cadastro (200 caracteres). Enviado
  vazio (ou só com espaços), **apaga** o nome fantasia (grava `null`), como num cadastro feito sem ele (DT40, nova).
- `name` segue as regras do cadastro: obrigatório quando enviado (vazio é recusado com `400`), até 200 caracteres,
  sem validação de termos proibidos (DT24 deixa o nome do responsável de fora).
- `companyName`, `cnpj` e `email` continuam recusados como campos não editáveis (RN27), assim como a senha.
- Tudo continua numa única transação com usuário, endereço e instituição, e com a troca de imagem já existente.
- A leitura (`GET .../me`, RF11) não muda: já devolve todos os dados cadastrais, exceto a senha.

### Frontend (tela "Meu perfil")

- No modo edição, nome fantasia (opcional) e nome do responsável viram campos editáveis. Razão social, CNPJ e
  e-mail pessoal continuam com cadeado.
- No modo visualização, o cadeado sai do nome fantasia e do nome do responsável e fica só nos três campos fixos.
- Termo proibido no nome fantasia aparece como erro no próprio campo (`PROHIBITED_CONTENT`, `fields: ['tradeName']`).
- Depois de salvar, a sessão é recarregada, para o menu do usuário mostrar o nome do responsável e a foto novos.
- Apagar o nome fantasia funciona também quando a mesma submissão leva uma foto nova (envio multipart).

### Documentação

- `docs/REQUISITOS.md`: DT40 nova (nome fantasia pode ser apagado na edição) e status do RF03 e do RF11.
- `docs/PLANO-IMPLEMENTACAO.md`: item 4.2 marcado ✅ ao fim.

**Decisão tomada com a dupla antes da proposta:**

- **DT40:** na edição do próprio perfil (RF03), a instituição pode apagar o nome fantasia deixando o campo vazio.
  O valor volta a ser `null`, como num cadastro sem nome fantasia, e onde o nome público aparece passa a valer a
  razão social (RN36).

### Fora desta change

- Listagem de instituições e perfil público (RF10, RF12, RF13, RN35, RN36): 4.3 `instituicoes-e-perfil-publico`.
- Exclusão da própria conta e "Zona de perigo" no perfil (RF04, RF05, RN28–RN30): 4.4 `exclusao-propria-conta`.
- Edição do perfil de instituição pelo administrador (RF44): 5.2 `admin-instituicoes`.
- Revalidação da sessão ao focar a janela (cabeçalho desatualizado após editar o perfil em outra aba): continua em
  `docs/PENDENCIAS.md`, para a 4.4.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `estabelecimentos/edicao-cadastro`: nome fantasia e nome do responsável entram na lista de campos editáveis e saem
  da lista de campos recusados; regra de apagar o nome fantasia; tela de perfil com os novos campos editáveis.
- `entidades-beneficiarias/edicao-cadastro`: as mesmas alterações, para a entidade beneficiária.
- `moderacao/textos-livres`: o nome fantasia passa a ser validado também na edição da instituição, não só no
  cadastro.

## Impact

- **Backend:** `establishments/dto/update-establishment.dto.ts`,
  `beneficiary-entities/dto/update-beneficiary-entity.dto.ts`, `update()` dos dois services, documentação Scalar dos
  dois `PATCH .../me` e testes dos services. Sem migration: `User.name` e `tradeName` já existem.
- **Frontend:** `features/profile/` (`profile-api.ts`, `profile-schema.ts`, `profile-form.tsx`, `profile-view.tsx`,
  `profile-page.tsx`) e `lib/form-data.ts` (envio de campo vazio no multipart).
- **API:** compatível com clientes atuais. Dois campos novos opcionais no corpo do `PATCH`; nenhuma resposta muda.
- **Docs:** `docs/REQUISITOS.md` (DT40) e `docs/PLANO-IMPLEMENTACAO.md`.
