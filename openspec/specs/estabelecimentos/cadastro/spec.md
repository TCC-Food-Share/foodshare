# estabelecimentos/cadastro Specification

## Purpose

Permitir que um estabelecimento crie uma conta na plataforma informando dados pessoais do responsável, dados institucionais e endereço, viabilizando os demais fluxos do MVP que dependem de um estabelecimento cadastrado.

## Requirements

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

### Requirement: Unicidade de CNPJ, e-mail e celular no cadastro
O sistema SHALL impedir o cadastro de um estabelecimento quando o CNPJ, o e-mail institucional, o celular institucional, o e-mail pessoal ou o celular pessoal informados já pertencerem a outro cadastro, rejeitando a submissão e identificando todos os campos duplicados encontrados, sem criar nenhum registro (`User`, `Address` ou `Establishment`).

#### Scenario: Um único campo duplicado
- **WHEN** um estabelecimento envia um cadastro em que apenas o CNPJ já pertence a outro cadastro (demais campos únicos)
- **THEN** o sistema rejeita o cadastro, informa que o CNPJ já está em uso e não cria nenhum registro

#### Scenario: Múltiplos campos duplicados na mesma submissão
- **WHEN** um estabelecimento envia um cadastro em que o e-mail institucional e o celular pessoal já pertencem a outro cadastro
- **THEN** o sistema rejeita o cadastro numa única resposta informando ambos os campos duplicados e não cria nenhum registro

#### Scenario: Nenhum campo duplicado
- **WHEN** um estabelecimento envia um cadastro em que CNPJ, e-mail institucional, celular institucional, e-mail pessoal e celular pessoal são todos inéditos
- **THEN** o sistema prossegue com a criação normal do cadastro

#### Scenario: Colisão de cadastros concorrentes (condição de corrida)
- **WHEN** dois cadastros com o mesmo CNPJ, e-mail ou celular são submetidos ao mesmo tempo e ambos passam pela checagem prévia de unicidade antes que qualquer um seja persistido
- **THEN** o sistema garante que apenas um dos dois cadastros seja criado e rejeita o outro, sem deixar registros duplicados ou parciais persistidos
