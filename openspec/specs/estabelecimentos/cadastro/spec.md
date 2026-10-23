# estabelecimentos/cadastro Specification

## Purpose

Permitir que um estabelecimento crie uma conta na plataforma informando dados pessoais do responsável, dados institucionais e endereço, viabilizando os demais fluxos que dependem de um estabelecimento cadastrado.

## Requirements

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

### Requirement: Senha armazenada com hash
O sistema SHALL armazenar a senha do responsável usando hash criptográfico, nunca em texto puro, e SHALL nunca retornar a senha (hash ou texto puro) em nenhuma resposta da API.

#### Scenario: Persistência da senha
- **WHEN** um cadastro de estabelecimento é criado com sucesso
- **THEN** o valor de senha persistido no banco é um hash, não o texto original enviado

#### Scenario: Resposta da API não expõe senha
- **WHEN** um cadastro de estabelecimento é criado com sucesso
- **THEN** a resposta retornada ao cliente não contém a senha em nenhuma forma

### Requirement: Atomicidade do cadastro
O sistema SHALL criar o usuário, o endereço, o estabelecimento e a imagem guardada como uma única operação atômica: se qualquer parte falhar, nenhum registro parcial permanece persistido e nenhum arquivo do cadastro permanece no armazenamento.

#### Scenario: Falha durante a criação
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades do cadastro (usuário, endereço ou estabelecimento)
- **THEN** o sistema não deixa nenhum registro órfão ou parcial, apaga a imagem já guardada para esse cadastro e retorna erro ao cliente

#### Scenario: Cadastro rejeitado por unicidade
- **WHEN** um estabelecimento envia uma imagem válida, mas o cadastro é rejeitado porque o CNPJ, um e-mail ou um celular já está em uso
- **THEN** nenhum arquivo do cadastro permanece no armazenamento

### Requirement: Unicidade de CNPJ, e-mail e celular no cadastro
O sistema SHALL impedir o cadastro de um estabelecimento quando o CNPJ, o e-mail institucional, o celular institucional, o e-mail pessoal ou o celular pessoal informados já pertencerem a outro cadastro, rejeitando a submissão sem criar nenhum registro (`User`, `Address` ou `Establishment`). Para CNPJ, e-mail institucional e celular institucional, o sistema SHALL identificar explicitamente qual desses campos está duplicado. Para e-mail pessoal e celular pessoal, o sistema SHALL informar apenas que um dado pessoal (e-mail ou celular) já está cadastrado, sem revelar qual dos dois — a mesma indicação genérica é usada tanto se só um deles colidir quanto se os dois colidirem ao mesmo tempo, para impedir que alguém descubra, testando valores um de cada vez num endpoint público sem autenticação, se um e-mail ou celular pessoal específico já está cadastrado na plataforma.

#### Scenario: Um único campo duplicado
- **WHEN** um estabelecimento envia um cadastro em que apenas o CNPJ já pertence a outro cadastro (demais campos únicos)
- **THEN** o sistema rejeita o cadastro, informa que o CNPJ já está em uso e não cria nenhum registro

#### Scenario: Múltiplos campos duplicados na mesma submissão
- **WHEN** um estabelecimento envia um cadastro em que o CNPJ e o e-mail pessoal já pertencem a outro cadastro
- **THEN** o sistema rejeita o cadastro numa única resposta informando o CNPJ explicitamente e uma indicação genérica de dado pessoal duplicado (sem citar e-mail ou celular), e não cria nenhum registro

#### Scenario: Dado pessoal duplicado (e-mail ou celular)
- **WHEN** um estabelecimento envia um cadastro em que o e-mail pessoal já pertence a outro cadastro (demais campos únicos)
- **THEN** o sistema rejeita o cadastro com uma mensagem genérica indicando que um dado pessoal já está cadastrado, sem citar e-mail ou celular especificamente, e não cria nenhum registro

#### Scenario: E-mail pessoal e celular pessoal duplicados ao mesmo tempo
- **WHEN** um estabelecimento envia um cadastro em que tanto o e-mail pessoal quanto o celular pessoal já pertencem a outro cadastro
- **THEN** o sistema rejeita o cadastro com a mesma mensagem genérica de dado pessoal duplicado usada quando só um dos dois colide, e não cria nenhum registro

#### Scenario: Nenhum campo duplicado
- **WHEN** um estabelecimento envia um cadastro em que CNPJ, e-mail institucional, celular institucional, e-mail pessoal e celular pessoal são todos inéditos
- **THEN** o sistema prossegue com a criação normal do cadastro

#### Scenario: Colisão de cadastros concorrentes (condição de corrida)
- **WHEN** dois cadastros com o mesmo CNPJ, e-mail ou celular são submetidos ao mesmo tempo e ambos passam pela checagem prévia de unicidade antes que qualquer um seja persistido
- **THEN** o sistema garante que apenas um dos dois cadastros seja criado e rejeita o outro, sem deixar registros duplicados ou parciais persistidos

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
