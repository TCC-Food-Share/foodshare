## MODIFIED Requirements

### Requirement: Edição de dados cadastrais editáveis da entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada edite, em qualquer combinação, os seguintes dados do próprio cadastro (RF03): nome fantasia, e-mail institucional, celular institucional, celular pessoal, nome do responsável, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual. O nome fantasia SHALL aceitar até 200 caracteres e, quando enviado vazio ou só com espaços, SHALL ser apagado, ficando sem valor como num cadastro feito sem ele (DT40). O nome do responsável SHALL aceitar até 200 caracteres e, quando enviado, SHALL ser recusado se vier vazio ou só com espaços. A imagem SHALL ser enviada como arquivo na mesma submissão dos demais campos, seguindo as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP); a imagem como texto (URL ou chave) SHALL ser rejeitada como campo não editável.

#### Scenario: Edição de um único campo
- **WHEN** uma entidade beneficiária autenticada envia a edição contendo apenas um arquivo de imagem válido
- **THEN** o sistema atualiza somente a imagem e mantém os demais campos editáveis inalterados

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** uma entidade beneficiária autenticada envia descrição, celular pessoal e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados da entidade beneficiária (sem a senha)

#### Scenario: Edição do nome fantasia e do nome do responsável
- **WHEN** uma entidade beneficiária autenticada envia um nome fantasia novo e um nome do responsável novo
- **THEN** o sistema atualiza os dois campos e a resposta traz os valores novos em `tradeName` e `user.name`

#### Scenario: Nome fantasia apagado
- **WHEN** uma entidade beneficiária autenticada com nome fantasia envia o nome fantasia só com espaços
- **THEN** o sistema apaga o nome fantasia e a resposta traz `tradeName` como `null`

#### Scenario: Nome fantasia apagado junto de foto nova
- **WHEN** uma entidade beneficiária autenticada envia, numa mesma submissão com arquivo de imagem válido, o nome fantasia vazio
- **THEN** o sistema troca a imagem, apaga o nome fantasia e a resposta traz `tradeName` como `null`

#### Scenario: Nome do responsável vazio
- **WHEN** uma entidade beneficiária autenticada envia o nome do responsável vazio, junto de outros campos válidos
- **THEN** o sistema rejeita a edição inteira com `400` e não altera nenhum dado

#### Scenario: Nome do responsável acima do limite
- **WHEN** uma entidade beneficiária autenticada envia um nome do responsável com mais de 200 caracteres
- **THEN** o sistema rejeita a edição inteira com `400` e não altera nenhum dado

#### Scenario: Endereço enviado como unidade completa
- **WHEN** uma entidade beneficiária autenticada envia apenas parte dos campos de endereço (ex: só o CEP, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

#### Scenario: Imagem enviada como texto
- **WHEN** uma entidade beneficiária autenticada envia o campo de imagem com uma URL em texto, em vez de um arquivo
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Imagem inválida na edição
- **WHEN** uma entidade beneficiária autenticada envia descrição nova junto de um arquivo GIF como imagem
- **THEN** o sistema rejeita a edição inteira com `400` e `code` `IMAGE_INVALID_TYPE`, e não altera nenhum dado, nem a descrição

### Requirement: Campos não editáveis rejeitados na edição da entidade beneficiária
O sistema SHALL rejeitar a submissão inteira, sem persistir nenhuma alteração, quando o corpo da requisição de edição contiver qualquer campo fora da lista de campos editáveis. Razão social, CNPJ e e-mail pessoal SHALL ser sempre recusados (RN27), assim como a senha.

#### Scenario: Submissão inclui campo não editável
- **WHEN** uma entidade beneficiária autenticada envia, junto com campos editáveis válidos, um valor para e-mail pessoal ou CNPJ
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Submissão inclui a razão social
- **WHEN** uma entidade beneficiária autenticada envia, junto de um nome fantasia novo, um valor para a razão social
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado, nem o nome fantasia

## ADDED Requirements

### Requirement: Campos editáveis e fixos na tela de perfil
A tela de perfil do frontend SHALL mostrar todos os dados cadastrais da entidade beneficiária, exceto a senha (RF11). No modo edição, nome fantasia (opcional), e-mail institucional, celular institucional, celular pessoal, nome do responsável, foto, descrição e endereço SHALL ser editáveis, e razão social, CNPJ e e-mail pessoal SHALL aparecer como somente leitura. No modo visualização, só razão social, CNPJ e e-mail pessoal SHALL ser marcados como fixos. Termo proibido no nome fantasia SHALL aparecer como erro no próprio campo. Depois de salvar, o menu do usuário SHALL passar a mostrar o nome do responsável e a foto atualizados, sem recarregar a página.

#### Scenario: Edição do nome do responsável pela tela
- **WHEN** a entidade beneficiária troca o nome do responsável na tela de perfil e salva
- **THEN** a tela volta ao modo visualização com o nome novo, e o menu do usuário mostra o nome novo

#### Scenario: Nome fantasia apagado pela tela com foto nova
- **WHEN** a entidade beneficiária apaga o nome fantasia, escolhe uma foto nova válida na tela de perfil e salva
- **THEN** a tela volta ao modo visualização sem nome fantasia, com "—" no lugar do valor, e com a foto nova

#### Scenario: Nome fantasia recusado pelo servidor
- **WHEN** a entidade beneficiária salva um nome fantasia que o servidor recusa com `code` `PROHIBITED_CONTENT` e `fields` contendo `tradeName`
- **THEN** a tela mostra a mensagem de conteúdo não permitido no campo do nome fantasia e mantém os demais campos como estavam

#### Scenario: Campos fixos no modo edição
- **WHEN** a entidade beneficiária abre o modo edição da tela de perfil
- **THEN** razão social, CNPJ e e-mail pessoal aparecem como somente leitura, e os demais campos do RF03 aparecem como editáveis
