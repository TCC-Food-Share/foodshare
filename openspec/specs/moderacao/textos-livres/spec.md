# moderacao/textos-livres Specification

## Purpose

Bloquear termos proibidos e links nos textos livres enviados pelas instituições, com a lista de termos configurável pelo painel e sem novo deploy (RNF07, RF67–RF70, DT10, DT24).

## Requirements

### Requirement: Campos de texto livre validados

O sistema SHALL validar o conteúdo dos seguintes campos, sempre que enviados: descrição e nome fantasia no cadastro de estabelecimento e de entidade beneficiária; descrição na edição de estabelecimento e de entidade beneficiária; descrição e observações no cadastro de alimento; texto da sugestão de nova opção. Campo opcional não enviado ou vazio SHALL ser aceito. Razão social, nome do responsável e endereço SHALL NOT passar por esta validação.

#### Scenario: Cadastro de instituição com termo proibido na descrição

- **WHEN** uma submissão de cadastro de estabelecimento ou de entidade beneficiária traz um termo proibido na descrição
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, sem criar conta nem gravar a imagem

#### Scenario: Cadastro de instituição com termo proibido no nome fantasia

- **WHEN** uma submissão de cadastro traz um termo proibido no nome fantasia
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, informando o campo `tradeName`

#### Scenario: Edição de instituição com termo proibido na descrição

- **WHEN** uma instituição autenticada envia uma edição com termo proibido na descrição, junto de outros campos válidos
- **THEN** o sistema recusa a edição inteira com `400` e `code` `PROHIBITED_CONTENT` e não altera nenhum dado, nem a imagem

#### Scenario: Cadastro de alimento com termo proibido

- **WHEN** um estabelecimento cadastra um alimento com termo proibido na descrição ou nas observações
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, sem criar o alimento nem gravar a imagem

#### Scenario: Alimento sem observações

- **WHEN** um estabelecimento cadastra um alimento válido sem observações
- **THEN** o sistema cria o alimento normalmente

#### Scenario: Campo fora da validação

- **WHEN** uma submissão de cadastro traz um termo proibido apenas na razão social
- **THEN** o sistema não recusa o cadastro por esse motivo

#### Scenario: Sugestão com termo proibido ou link

- **WHEN** uma instituição envia uma sugestão com termo proibido ou link no texto
- **THEN** o sistema recusa a sugestão com `400` e `code` `PROHIBITED_CONTENT`, informando o campo `text`, sem gravar nada

### Requirement: Comparação de termos por palavra inteira

O sistema SHALL recusar o texto que contenha um termo proibido como palavra inteira, sem diferenciar maiúsculas nem acentos. Pontuação SHALL funcionar como separador de palavras. Um termo com mais de uma palavra SHALL casar com a mesma sequência de palavras no texto. Palavra que apenas contenha o termo como trecho SHALL ser aceita.

#### Scenario: Termo em maiúsculas e com acento

- **WHEN** o termo "otario" está cadastrado e o texto enviado contém "OTÁRIO"
- **THEN** o sistema recusa o texto

#### Scenario: Termo junto de pontuação

- **WHEN** o termo "merda" está cadastrado e o texto enviado contém "merda!"
- **THEN** o sistema recusa o texto

#### Scenario: Termo como trecho de outra palavra

- **WHEN** os termos "puta" e "viado" estão cadastrados e o texto enviado é "Alimento enviado, boa reputação e sem disputa"
- **THEN** o sistema aceita o texto

#### Scenario: Termo com mais de uma palavra

- **WHEN** o termo "pessoa ruim" está cadastrado e o texto enviado contém "Pessoa   ruim" ou "pessoa-ruim"
- **THEN** o sistema recusa o texto

#### Scenario: Variação não cadastrada

- **WHEN** só o termo "merda" está cadastrado e o texto enviado contém "merdas"
- **THEN** o sistema aceita o texto

### Requirement: Lista de termos vale sem novo deploy

A validação SHALL usar a lista atual de termos proibidos. Um termo cadastrado, editado ou excluído pelo administrador SHALL valer a partir da requisição seguinte, sem novo deploy nem reinício. Os termos SHALL NOT ser expostos às instituições, nem na resposta de recusa.

#### Scenario: Termo novo cadastrado no painel

- **WHEN** o administrador cadastra um termo e, em seguida, um estabelecimento envia um texto com esse termo
- **THEN** o sistema recusa o texto

#### Scenario: Termo excluído no painel

- **WHEN** o administrador exclui um termo e, em seguida, um estabelecimento envia um texto com esse termo
- **THEN** o sistema aceita o texto

#### Scenario: Resposta não revela o termo

- **WHEN** o sistema recusa um texto por conter termo proibido
- **THEN** a resposta não informa qual termo casou

### Requirement: Bloqueio de links e domínios

O sistema SHALL recusar o texto que contenha um endereço com esquema (como `https://`), um endereço iniciado por `www.`, um domínio com terminação conhecida (como `site.com.br` ou `site.org`) ou um domínio seguido de caminho (como `wa.me/5518999991234`), sem diferenciar maiúsculas. Endereço de e-mail SHALL ser recusado por conter domínio. O bloqueio SHALL independer da lista de termos. Telefone e menção como `@perfil` SHALL NOT ser recusados por esta regra. Texto com ponto que não forme um domínio SHALL ser aceito.

#### Scenario: Endereço com esquema

- **WHEN** o texto enviado contém "Veja em HTTPS://exemplo.com.br/oferta"
- **THEN** o sistema recusa o texto

#### Scenario: Endereço com www

- **WHEN** o texto enviado contém "www.exemplo.com"
- **THEN** o sistema recusa o texto

#### Scenario: Domínio sem esquema

- **WHEN** o texto enviado contém "exemplo.com.br" ou "instagram.com/fulano"
- **THEN** o sistema recusa o texto

#### Scenario: Domínio curto com caminho

- **WHEN** o texto enviado contém "wa.me/5518999991234"
- **THEN** o sistema recusa o texto

#### Scenario: E-mail

- **WHEN** o texto enviado contém "fulano@gmail.com"
- **THEN** o sistema recusa o texto

#### Scenario: Telefone e menção

- **WHEN** o texto enviado contém "(18) 99999-1234" ou "@perfil"
- **THEN** o sistema não recusa o texto por esta regra

#### Scenario: Texto comum com ponto

- **WHEN** o texto enviado é "Pacote de 1.5kg. Retirar às 18h.Trazer sacola" ou "Padaria Silva Ltda.ME"
- **THEN** o sistema aceita o texto

### Requirement: Formato do erro de conteúdo proibido

A recusa SHALL responder `400` com `code` `PROHIBITED_CONTENT` e `fields`, a lista com o nome de todos os campos recusados. Termo proibido e link SHALL usar o mesmo `code`. Se a submissão também tiver campo em formato inválido, a resposta SHALL ser o `400` de validação comum, sem `code` `PROHIBITED_CONTENT`.

#### Scenario: Dois campos recusados

- **WHEN** um estabelecimento cadastra um alimento com link na descrição e termo proibido nas observações
- **THEN** a resposta é `400` com `code` `PROHIBITED_CONTENT` e `fields` contendo `description` e `notes`

#### Scenario: Conteúdo proibido junto de formato inválido

- **WHEN** uma submissão traz termo proibido na descrição e quantidade negativa
- **THEN** a resposta é o `400` de validação comum, informando os campos inválidos

### Requirement: Erro exibido no campo

O frontend SHALL mostrar a recusa junto de cada campo informado em `fields`, com uma mensagem única que cite palavras não permitidas ou links, sem exibir o aviso genérico de dados inválidos. Corrigido o texto, a pessoa SHALL poder reenviar sem perder o restante do formulário. A validação SHALL acontecer no servidor: os termos não são enviados ao navegador.

#### Scenario: Cadastro de instituição em várias etapas

- **WHEN** o cadastro é recusado na última etapa por conteúdo proibido na descrição ou no nome fantasia
- **THEN** o formulário volta para a etapa dos dados institucionais, com o erro no campo e os dados preenchidos mantidos

#### Scenario: Edição de perfil

- **WHEN** a edição de perfil é recusada por conteúdo proibido na descrição
- **THEN** a tela continua em modo de edição, com o erro no campo descrição

#### Scenario: Cadastro de alimento

- **WHEN** o cadastro de alimento é recusado por conteúdo proibido nas observações
- **THEN** o modal continua aberto, com o erro no campo observações e os dados preenchidos mantidos
