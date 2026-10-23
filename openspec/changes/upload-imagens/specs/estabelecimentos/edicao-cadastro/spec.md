## MODIFIED Requirements

### Requirement: Edição de dados cadastrais editáveis do estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado edite, em qualquer combinação, os seguintes dados do próprio cadastro: celular pessoal, celular institucional, e-mail institucional, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual. A imagem SHALL ser enviada como arquivo na mesma submissão dos demais campos, seguindo as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP); a imagem como texto (URL ou chave) SHALL ser rejeitada como campo não editável.

#### Scenario: Edição de um único campo
- **WHEN** um estabelecimento autenticado envia a edição contendo apenas a descrição
- **THEN** o sistema atualiza somente a descrição e mantém os demais campos editáveis inalterados, inclusive a imagem

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** um estabelecimento autenticado envia celular institucional, um arquivo de imagem válido e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados do estabelecimento (sem a senha), com a imagem nova como URL da rota de leitura de imagem

#### Scenario: Endereço enviado como unidade completa
- **WHEN** um estabelecimento autenticado envia apenas parte dos campos de endereço (ex: só a cidade, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

#### Scenario: Imagem enviada como texto
- **WHEN** um estabelecimento autenticado envia o campo de imagem com uma URL em texto, em vez de um arquivo
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Imagem inválida na edição
- **WHEN** um estabelecimento autenticado envia descrição nova junto de uma imagem acima de 5 MB
- **THEN** o sistema rejeita a edição inteira com `400` e `code` `IMAGE_TOO_LARGE`, e não altera nenhum dado, nem a descrição

## ADDED Requirements

### Requirement: Troca da imagem do estabelecimento
Quando uma edição com imagem nova for concluída, o sistema SHALL passar a usar a imagem nova e SHALL apagar do armazenamento a imagem anterior do estabelecimento, se houver. Quando a edição falhar, o sistema SHALL manter a imagem anterior e SHALL apagar do armazenamento a imagem nova enviada nessa edição. Uma falha ao apagar a imagem anterior SHALL ser registrada em log e SHALL NOT desfazer nem falhar a edição já concluída.

#### Scenario: Troca concluída
- **WHEN** um estabelecimento autenticado com imagem envia uma imagem nova válida
- **THEN** a resposta traz a imagem nova, e a imagem anterior deixa de existir no armazenamento

#### Scenario: Primeira imagem de um cadastro sem imagem
- **WHEN** um estabelecimento autenticado sem imagem envia uma imagem válida
- **THEN** o sistema passa a usar a imagem enviada, sem tentar apagar nenhuma anterior

#### Scenario: Edição falha depois do envio da imagem
- **WHEN** um estabelecimento autenticado envia uma imagem nova válida junto de um celular institucional já usado por outro cadastro
- **THEN** o sistema rejeita a edição, mantém a imagem anterior e não deixa a imagem nova no armazenamento

### Requirement: Troca de foto na tela de perfil
A tela de edição de perfil do frontend SHALL usar o componente de seleção de imagem da plataforma no lugar do campo de URL, mostrando a imagem atual até que outra seja escolhida. Salvar sem escolher imagem nova SHALL manter a imagem atual. Quando o servidor rejeitar a imagem, a tela SHALL mostrar a mensagem correspondente à `code`, sem perder os demais campos preenchidos.

#### Scenario: Salvar sem trocar a foto
- **WHEN** o estabelecimento altera só a descrição na tela de perfil e salva
- **THEN** a tela envia a edição sem imagem e a foto atual continua a mesma

#### Scenario: Salvar com foto nova
- **WHEN** o estabelecimento escolhe uma imagem nova válida na tela de perfil e salva
- **THEN** a tela envia a imagem junto da edição e, depois de salvar, mostra a foto nova

#### Scenario: Servidor rejeita a foto
- **WHEN** o estabelecimento salva com uma imagem que o servidor rejeita com `code` `IMAGE_INVALID_TYPE`
- **THEN** a tela mostra a mensagem de formato não aceito junto do componente e mantém os demais campos como estavam
