## ADDED Requirements

### Requirement: Unicidade de CNPJ, e-mail e celular no cadastro
O sistema SHALL impedir o cadastro de um estabelecimento quando o CNPJ, o e-mail institucional, o celular institucional, o e-mail pessoal ou o celular pessoal informados já pertencerem a outro cadastro, rejeitando a submissão e identificando todos os campos duplicados encontrados, sem criar nenhum registro (`Usuario`, `Endereco` ou `Estabelecimento`).

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
