## MODIFIED Requirements

### Requirement: Edição de dados cadastrais editáveis do estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado edite, em qualquer combinação, os seguintes dados do próprio cadastro (RF03): nome fantasia, e-mail institucional, celular institucional, celular pessoal, nome do responsável, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual. O nome fantasia SHALL aceitar até 200 caracteres e, quando enviado vazio ou só com espaços, SHALL ser apagado, ficando sem valor como num cadastro feito sem ele (DT40). O nome do responsável SHALL aceitar até 200 caracteres e, quando enviado, SHALL ser recusado se vier vazio ou só com espaços. A imagem SHALL ser enviada como arquivo na mesma submissão dos demais campos, seguindo as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP); a imagem como texto (URL ou chave) SHALL ser rejeitada como campo não editável.

#### Scenario: Edição de um único campo
- **WHEN** um estabelecimento autenticado envia a edição contendo apenas a descrição
- **THEN** o sistema atualiza somente a descrição e mantém os demais campos editáveis inalterados, inclusive a imagem

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** um estabelecimento autenticado envia celular institucional, um arquivo de imagem válido e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados do estabelecimento (sem a senha), com a imagem nova como URL da rota de leitura de imagem

#### Scenario: Edição do nome fantasia e do nome do responsável
- **WHEN** um estabelecimento autenticado envia um nome fantasia novo e um nome do responsável novo
- **THEN** o sistema atualiza os dois campos e a resposta traz os valores novos em `tradeName` e `user.name`

#### Scenario: Nome fantasia apagado
- **WHEN** um estabelecimento autenticado com nome fantasia envia o nome fantasia vazio
- **THEN** o sistema apaga o nome fantasia e a resposta traz `tradeName` como `null`

#### Scenario: Nome fantasia apagado junto de foto nova
- **WHEN** um estabelecimento autenticado envia, numa mesma submissão com arquivo de imagem válido, o nome fantasia vazio
- **THEN** o sistema troca a imagem, apaga o nome fantasia e a resposta traz `tradeName` como `null`

#### Scenario: Nome do responsável vazio
- **WHEN** um estabelecimento autenticado envia o nome do responsável vazio ou só com espaços, junto de outros campos válidos
- **THEN** o sistema rejeita a edição inteira com `400` e não altera nenhum dado

#### Scenario: Nome fantasia acima do limite
- **WHEN** um estabelecimento autenticado envia um nome fantasia com mais de 200 caracteres
- **THEN** o sistema rejeita a edição inteira com `400` e não altera nenhum dado

#### Scenario: Endereço enviado como unidade completa
- **WHEN** um estabelecimento autenticado envia apenas parte dos campos de endereço (ex: só a cidade, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

#### Scenario: Imagem enviada como texto
- **WHEN** um estabelecimento autenticado envia o campo de imagem com uma URL em texto, em vez de um arquivo
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Imagem inválida na edição
- **WHEN** um estabelecimento autenticado envia descrição nova junto de uma imagem acima de 5 MB
- **THEN** o sistema rejeita a edição inteira com `400` e `code` `IMAGE_TOO_LARGE`, e não altera nenhum dado, nem a descrição

### Requirement: Campos não editáveis rejeitados na edição do estabelecimento
O sistema SHALL rejeitar a submissão inteira, sem persistir nenhuma alteração, quando o corpo da requisição de edição contiver qualquer campo fora da lista de campos editáveis. Razão social, CNPJ e e-mail pessoal SHALL ser sempre recusados (RN27), assim como a senha.

#### Scenario: Submissão inclui campo não editável
- **WHEN** um estabelecimento autenticado envia, junto com campos editáveis válidos, um valor para CNPJ ou razão social
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Submissão inclui o e-mail pessoal
- **WHEN** um estabelecimento autenticado envia, junto de um nome do responsável novo, um valor para o e-mail pessoal
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado, nem o nome do responsável

## ADDED Requirements

### Requirement: Campos editáveis e fixos na tela de perfil
A tela de perfil do frontend SHALL mostrar todos os dados cadastrais do estabelecimento, exceto a senha (RF11). No modo edição, nome fantasia (opcional), e-mail institucional, celular institucional, celular pessoal, nome do responsável, foto, descrição e endereço SHALL ser editáveis, e razão social, CNPJ e e-mail pessoal SHALL aparecer como somente leitura. No modo visualização, só razão social, CNPJ e e-mail pessoal SHALL ser marcados como fixos. Termo proibido no nome fantasia SHALL aparecer como erro no próprio campo. Depois de salvar, o menu do usuário SHALL passar a mostrar o nome do responsável e a foto atualizados, sem recarregar a página.

#### Scenario: Edição do nome do responsável pela tela
- **WHEN** o estabelecimento troca o nome do responsável na tela de perfil e salva
- **THEN** a tela volta ao modo visualização com o nome novo, e o menu do usuário mostra o nome novo

#### Scenario: Nome fantasia apagado pela tela
- **WHEN** o estabelecimento apaga o nome fantasia na tela de perfil e salva
- **THEN** a tela volta ao modo visualização sem nome fantasia, com "—" no lugar do valor

#### Scenario: Nome fantasia recusado pelo servidor
- **WHEN** o estabelecimento salva um nome fantasia que o servidor recusa com `code` `PROHIBITED_CONTENT` e `fields` contendo `tradeName`
- **THEN** a tela mostra a mensagem de conteúdo não permitido no campo do nome fantasia e mantém os demais campos como estavam

#### Scenario: Campos fixos no modo edição
- **WHEN** o estabelecimento abre o modo edição da tela de perfil
- **THEN** razão social, CNPJ e e-mail pessoal aparecem como somente leitura, e os demais campos do RF03 aparecem como editáveis
