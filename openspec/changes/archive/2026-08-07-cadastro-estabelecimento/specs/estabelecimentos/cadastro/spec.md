## Purpose

Permitir que um estabelecimento crie uma conta na plataforma informando dados pessoais do responsável, dados institucionais e endereço, viabilizando os demais fluxos do MVP que dependem de um estabelecimento cadastrado.

## ADDED Requirements

### Requirement: Cadastro de estabelecimento
O sistema SHALL permitir que um estabelecimento se cadastre informando, em uma única submissão: dados pessoais do responsável (nome, e-mail pessoal, celular pessoal, senha), dados institucionais (razão social, nome fantasia opcional, CNPJ, e-mail institucional, celular institucional, descrição) e dados de endereço (CEP, logradouro, número, complemento opcional, cidade, estado).

#### Scenario: Cadastro com todos os dados válidos
- **WHEN** um estabelecimento envia dados pessoais, institucionais e de endereço válidos e completos
- **THEN** o sistema cria o cadastro e retorna confirmação com os dados do estabelecimento (sem a senha)

#### Scenario: Campo obrigatório ausente
- **WHEN** um estabelecimento envia a submissão sem preencher um campo obrigatório (ex: CNPJ, e-mail institucional ou algum campo de endereço)
- **THEN** o sistema rejeita o cadastro e informa quais campos são inválidos, sem criar nenhum registro

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
O sistema SHALL criar o usuário, o endereço e o estabelecimento como uma única operação atômica: se qualquer parte falhar, nenhum registro parcial permanece persistido.

#### Scenario: Falha durante a criação
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades do cadastro (usuário, endereço ou estabelecimento)
- **THEN** o sistema não deixa nenhum registro órfão ou parcial e retorna erro ao cliente
