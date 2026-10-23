## MODIFIED Requirements

### Requirement: Cadastro de estabelecimento
O sistema SHALL permitir que um estabelecimento se cadastre informando, em uma única submissão: dados pessoais do responsável (nome, e-mail pessoal, celular pessoal, senha, imagem), dados institucionais (razão social, nome fantasia opcional, CNPJ, e-mail institucional, celular institucional, descrição) e dados de endereço (CEP, logradouro, número, complemento opcional, cidade, estado). A imagem SHALL ser enviada como arquivo na mesma submissão dos demais dados e SHALL seguir as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP). A submissão sem imagem SHALL ser rejeitada com `400` e `code` `IMAGE_REQUIRED`.

#### Scenario: Cadastro com todos os dados válidos
- **WHEN** um estabelecimento envia dados pessoais, institucionais e de endereço válidos e completos, junto de uma imagem válida
- **THEN** o sistema cria o cadastro, guarda a imagem e retorna confirmação com os dados do estabelecimento (sem a senha), com a imagem do responsável como URL da rota de leitura de imagem

#### Scenario: Campo obrigatório ausente
- **WHEN** um estabelecimento envia a submissão sem preencher um campo obrigatório (ex: CNPJ, e-mail institucional ou algum campo de endereço)
- **THEN** o sistema rejeita o cadastro e informa quais campos são inválidos, sem criar nenhum registro

#### Scenario: Imagem ausente
- **WHEN** um estabelecimento envia todos os dados válidos, mas sem imagem
- **THEN** o sistema rejeita o cadastro com `400` e `code` `IMAGE_REQUIRED`, sem criar nenhum registro

#### Scenario: Imagem inválida
- **WHEN** um estabelecimento envia todos os dados válidos com uma imagem acima de 5 MB ou fora de JPEG, PNG e WebP
- **THEN** o sistema rejeita o cadastro com `400` e a `code` do motivo (`IMAGE_TOO_LARGE` ou `IMAGE_INVALID_TYPE`), sem criar nenhum registro nem guardar o arquivo

#### Scenario: Campo em formato inválido
- **WHEN** um estabelecimento envia um campo em formato inválido (ex: e-mail sem `@`, CNPJ com quantidade errada de dígitos, estado fora da sigla de 2 letras)
- **THEN** o sistema rejeita o cadastro e informa quais campos são inválidos, sem criar nenhum registro

### Requirement: Atomicidade do cadastro
O sistema SHALL criar o usuário, o endereço, o estabelecimento e a imagem guardada como uma única operação atômica: se qualquer parte falhar, nenhum registro parcial permanece persistido e nenhum arquivo do cadastro permanece no armazenamento.

#### Scenario: Falha durante a criação
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades do cadastro (usuário, endereço ou estabelecimento)
- **THEN** o sistema não deixa nenhum registro órfão ou parcial, apaga a imagem já guardada para esse cadastro e retorna erro ao cliente

#### Scenario: Cadastro rejeitado por unicidade
- **WHEN** um estabelecimento envia uma imagem válida, mas o cadastro é rejeitado porque o CNPJ, um e-mail ou um celular já está em uso
- **THEN** nenhum arquivo do cadastro permanece no armazenamento

## ADDED Requirements

### Requirement: Etapa de foto no formulário de cadastro
O formulário de cadastro do frontend SHALL ter uma etapa "Foto de perfil", obrigatória, depois da etapa de endereço, usando o componente de seleção de imagem da plataforma. O formulário SHALL impedir a conclusão do cadastro enquanto nenhuma imagem válida estiver selecionada. Quando o servidor rejeitar a imagem, o formulário SHALL voltar para a etapa "Foto de perfil" e mostrar a mensagem correspondente à `code`.

#### Scenario: Concluir sem foto
- **WHEN** o usuário chega à etapa "Foto de perfil" e tenta concluir o cadastro sem escolher imagem
- **THEN** o formulário não envia o cadastro e informa que a foto é obrigatória

#### Scenario: Concluir com foto
- **WHEN** o usuário escolhe uma imagem válida na etapa "Foto de perfil" e conclui o cadastro
- **THEN** o formulário envia os dados e a imagem numa única submissão e, com o cadastro criado, leva o usuário para o login

#### Scenario: Servidor rejeita a imagem
- **WHEN** o usuário conclui o cadastro e o servidor responde `400` com `code` `IMAGE_INVALID_TYPE`
- **THEN** o formulário volta para a etapa "Foto de perfil" e mostra a mensagem de formato não aceito

#### Scenario: Dado duplicado depois da foto
- **WHEN** o usuário conclui o cadastro com imagem válida e o servidor responde que o CNPJ já está em uso
- **THEN** o formulário volta para a etapa do CNPJ, como antes, e mantém a imagem escolhida para o próximo envio
