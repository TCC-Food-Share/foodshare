# estabelecimentos/edicao-cadastro Specification

## Purpose

Permitir que um estabelecimento já cadastrado atualize seus próprios dados cadastrais editáveis (nome fantasia, nome do responsável, contatos, imagem, descrição e endereço) sem precisar recriar o cadastro.

## Requirements

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

### Requirement: Validação de formato na edição do estabelecimento
O sistema SHALL validar o formato de cada campo editável enviado, usando as mesmas regras de formato aplicadas no cadastro (RF01), e SHALL rejeitar a edição inteira sem persistir nenhuma alteração quando algum campo enviado estiver em formato inválido.

#### Scenario: Campo em formato inválido
- **WHEN** um estabelecimento autenticado envia um campo em formato inválido (ex: estado fora da sigla de 2 letras, CEP fora do formato esperado)
- **THEN** o sistema rejeita a edição, informa quais campos são inválidos e não altera nenhum dado

### Requirement: Campos não editáveis rejeitados na edição do estabelecimento
O sistema SHALL rejeitar a submissão inteira, sem persistir nenhuma alteração, quando o corpo da requisição de edição contiver qualquer campo fora da lista de campos editáveis. Razão social, CNPJ e e-mail pessoal SHALL ser sempre recusados (RN27), assim como a senha.

#### Scenario: Submissão inclui campo não editável
- **WHEN** um estabelecimento autenticado envia, junto com campos editáveis válidos, um valor para CNPJ ou razão social
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

#### Scenario: Submissão inclui o e-mail pessoal
- **WHEN** um estabelecimento autenticado envia, junto de um nome do responsável novo, um valor para o e-mail pessoal
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado, nem o nome do responsável

### Requirement: Edição restrita à própria conta autenticada
O sistema SHALL determinar qual cadastro será editado exclusivamente a partir da sessão autenticada, nunca a partir de um identificador informado pelo cliente, e SHALL rejeitar qualquer tentativa de edição sem autenticação válida.

#### Scenario: Requisição sem autenticação
- **WHEN** uma edição é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não altera nenhum dado

#### Scenario: Edição sempre aplicada à conta autenticada
- **WHEN** um estabelecimento autenticado envia uma edição
- **THEN** o sistema aplica as alterações exclusivamente ao cadastro do estabelecimento autenticado, independentemente de qualquer identificador de outra conta presente na requisição

### Requirement: Unicidade de contato na edição do estabelecimento
O sistema SHALL rejeitar a edição, sem persistir nenhuma alteração, quando o celular pessoal, o celular institucional ou o e-mail institucional informado já pertencer a outro cadastro.

#### Scenario: Novo celular institucional já usado por outro cadastro
- **WHEN** um estabelecimento autenticado edita o celular institucional para um valor já usado por outro estabelecimento ou entidade beneficiária
- **THEN** o sistema rejeita a edição, informa que o campo já está em uso e não altera nenhum dado

#### Scenario: Novos valores de contato sem conflito
- **WHEN** um estabelecimento autenticado edita celular pessoal, celular institucional ou e-mail institucional para valores inéditos
- **THEN** o sistema aplica a edição normalmente

### Requirement: Atomicidade da edição do estabelecimento
O sistema SHALL aplicar as atualizações de usuário, endereço e estabelecimento envolvidas em uma edição como uma única operação atômica: se qualquer parte falhar, nenhuma alteração parcial permanece persistida.

#### Scenario: Falha durante a atualização
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades afetadas pela edição (usuário, endereço ou estabelecimento)
- **THEN** o sistema não deixa nenhuma alteração parcial persistida e retorna erro ao cliente

### Requirement: Leitura dos próprios dados cadastrais do estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado consulte o próprio cadastro completo (dados institucionais, dados do responsável e endereço, sem a senha), determinando qual cadastro retornar exclusivamente a partir da sessão autenticada.

#### Scenario: Consulta do próprio cadastro
- **WHEN** um estabelecimento autenticado solicita os próprios dados cadastrais
- **THEN** o sistema retorna os dados institucionais, os dados do responsável e o endereço vinculados ao cadastro do estabelecimento autenticado, sem incluir a senha

#### Scenario: Requisição sem autenticação
- **WHEN** a leitura do próprio cadastro é solicitada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não retorna nenhum dado

#### Scenario: Sessão sem estabelecimento vinculado
- **WHEN** um usuário autenticado sem estabelecimento vinculado à própria sessão solicita a leitura do próprio cadastro
- **THEN** o sistema informa que não há estabelecimento vinculado à sessão, sem retornar dado de nenhum outro cadastro

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
