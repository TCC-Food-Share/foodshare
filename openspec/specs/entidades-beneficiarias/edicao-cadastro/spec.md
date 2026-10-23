# entidades-beneficiarias/edicao-cadastro Specification

## Purpose

Permitir que uma entidade beneficiária já cadastrada atualize seus próprios dados cadastrais editáveis (contato, imagem, descrição e endereço) sem precisar recriar o cadastro.

## Requirements

### Requirement: Edição de dados cadastrais editáveis da entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada edite, em qualquer combinação, os seguintes dados do próprio cadastro: celular pessoal, celular institucional, e-mail institucional, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual. A imagem SHALL ser enviada como arquivo na mesma submissão dos demais campos, seguindo as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP); a imagem como texto (URL ou chave) SHALL ser rejeitada como campo não editável.

#### Scenario: Edição de um único campo
- **WHEN** uma entidade beneficiária autenticada envia a edição contendo apenas um arquivo de imagem válido
- **THEN** o sistema atualiza somente a imagem e mantém os demais campos editáveis inalterados

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** uma entidade beneficiária autenticada envia descrição, celular pessoal e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados da entidade beneficiária (sem a senha)

#### Scenario: Endereço enviado como unidade completa
- **WHEN** uma entidade beneficiária autenticada envia apenas parte dos campos de endereço (ex: só o CEP, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

#### Scenario: Imagem enviada como texto
- **WHEN** uma entidade beneficiária autenticada envia o campo de imagem com uma URL em texto, em vez de um arquivo
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Imagem inválida na edição
- **WHEN** uma entidade beneficiária autenticada envia descrição nova junto de um arquivo GIF como imagem
- **THEN** o sistema rejeita a edição inteira com `400` e `code` `IMAGE_INVALID_TYPE`, e não altera nenhum dado, nem a descrição

### Requirement: Validação de formato na edição da entidade beneficiária
O sistema SHALL validar o formato de cada campo editável enviado, usando as mesmas regras de formato aplicadas no cadastro (RF02), e SHALL rejeitar a edição inteira sem persistir nenhuma alteração quando algum campo enviado estiver em formato inválido.

#### Scenario: Campo em formato inválido
- **WHEN** uma entidade beneficiária autenticada envia um campo em formato inválido (ex: e-mail institucional sem `@`, estado fora da sigla de 2 letras)
- **THEN** o sistema rejeita a edição, informa quais campos são inválidos e não altera nenhum dado

### Requirement: Campos não editáveis rejeitados na edição da entidade beneficiária
O sistema SHALL rejeitar a submissão inteira, sem persistir nenhuma alteração, quando o corpo da requisição de edição contiver qualquer campo fora da lista de campos editáveis (ex: razão social, CNPJ, e-mail pessoal, nome do responsável, nome fantasia, senha).

#### Scenario: Submissão inclui campo não editável
- **WHEN** uma entidade beneficiária autenticada envia, junto com campos editáveis válidos, um valor para e-mail pessoal ou CNPJ
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

### Requirement: Edição restrita à própria conta autenticada
O sistema SHALL determinar qual cadastro será editado exclusivamente a partir da sessão autenticada, nunca a partir de um identificador informado pelo cliente, e SHALL rejeitar qualquer tentativa de edição sem autenticação válida.

#### Scenario: Requisição sem autenticação
- **WHEN** uma edição é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não altera nenhum dado

#### Scenario: Edição sempre aplicada à conta autenticada
- **WHEN** uma entidade beneficiária autenticada envia uma edição
- **THEN** o sistema aplica as alterações exclusivamente ao cadastro da entidade beneficiária autenticada, independentemente de qualquer identificador de outra conta presente na requisição

### Requirement: Unicidade de contato na edição da entidade beneficiária
O sistema SHALL rejeitar a edição, sem persistir nenhuma alteração, quando o celular pessoal, o celular institucional ou o e-mail institucional informado já pertencer a outro cadastro.

#### Scenario: Novo e-mail institucional já usado por outro cadastro
- **WHEN** uma entidade beneficiária autenticada edita o e-mail institucional para um valor já usado por outra entidade beneficiária ou estabelecimento
- **THEN** o sistema rejeita a edição, informa que o campo já está em uso e não altera nenhum dado

#### Scenario: Novos valores de contato sem conflito
- **WHEN** uma entidade beneficiária autenticada edita celular pessoal, celular institucional ou e-mail institucional para valores inéditos
- **THEN** o sistema aplica a edição normalmente

### Requirement: Atomicidade da edição da entidade beneficiária
O sistema SHALL aplicar as atualizações de usuário, endereço e entidade beneficiária envolvidas em uma edição como uma única operação atômica: se qualquer parte falhar, nenhuma alteração parcial permanece persistida.

#### Scenario: Falha durante a atualização
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades afetadas pela edição (usuário, endereço ou entidade beneficiária)
- **THEN** o sistema não deixa nenhuma alteração parcial persistida e retorna erro ao cliente

### Requirement: Leitura dos próprios dados cadastrais da entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada consulte o próprio cadastro completo (dados institucionais, dados do responsável e endereço, sem a senha), determinando qual cadastro retornar exclusivamente a partir da sessão autenticada.

#### Scenario: Consulta do próprio cadastro
- **WHEN** uma entidade beneficiária autenticada solicita os próprios dados cadastrais
- **THEN** o sistema retorna os dados institucionais, os dados do responsável e o endereço vinculados ao cadastro da entidade beneficiária autenticada, sem incluir a senha

#### Scenario: Requisição sem autenticação
- **WHEN** a leitura do próprio cadastro é solicitada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não retorna nenhum dado

#### Scenario: Sessão sem entidade beneficiária vinculada
- **WHEN** um usuário autenticado sem entidade beneficiária vinculada à própria sessão solicita a leitura do próprio cadastro
- **THEN** o sistema informa que não há entidade beneficiária vinculada à sessão, sem retornar dado de nenhum outro cadastro

### Requirement: Troca da imagem da entidade beneficiária
Quando uma edição com imagem nova for concluída, o sistema SHALL passar a usar a imagem nova e SHALL apagar do armazenamento a imagem anterior da entidade beneficiária, se houver. Quando a edição falhar, o sistema SHALL manter a imagem anterior e SHALL apagar do armazenamento a imagem nova enviada nessa edição. Uma falha ao apagar a imagem anterior SHALL ser registrada em log e SHALL NOT desfazer nem falhar a edição já concluída.

#### Scenario: Troca concluída
- **WHEN** uma entidade beneficiária autenticada com imagem envia uma imagem nova válida
- **THEN** a resposta traz a imagem nova, e a imagem anterior deixa de existir no armazenamento

#### Scenario: Primeira imagem de um cadastro sem imagem
- **WHEN** uma entidade beneficiária autenticada sem imagem envia uma imagem válida
- **THEN** o sistema passa a usar a imagem enviada, sem tentar apagar nenhuma anterior

#### Scenario: Edição falha depois do envio da imagem
- **WHEN** uma entidade beneficiária autenticada envia uma imagem nova válida junto de um e-mail institucional já usado por outro cadastro
- **THEN** o sistema rejeita a edição, mantém a imagem anterior e não deixa a imagem nova no armazenamento

### Requirement: Troca de foto na tela de perfil
A tela de edição de perfil do frontend SHALL usar o componente de seleção de imagem da plataforma no lugar do campo de URL, mostrando a imagem atual até que outra seja escolhida. Salvar sem escolher imagem nova SHALL manter a imagem atual. Quando o servidor rejeitar a imagem, a tela SHALL mostrar a mensagem correspondente à `code`, sem perder os demais campos preenchidos.

#### Scenario: Salvar sem trocar a foto
- **WHEN** a entidade beneficiária altera só a descrição na tela de perfil e salva
- **THEN** a tela envia a edição sem imagem e a foto atual continua a mesma

#### Scenario: Salvar com foto nova
- **WHEN** a entidade beneficiária escolhe uma imagem nova válida na tela de perfil e salva
- **THEN** a tela envia a imagem junto da edição e, depois de salvar, mostra a foto nova

#### Scenario: Servidor rejeita a foto
- **WHEN** a entidade beneficiária salva com uma imagem que o servidor rejeita com `code` `IMAGE_TOO_LARGE`
- **THEN** a tela mostra a mensagem de limite de 5 MB junto do componente e mantém os demais campos como estavam
