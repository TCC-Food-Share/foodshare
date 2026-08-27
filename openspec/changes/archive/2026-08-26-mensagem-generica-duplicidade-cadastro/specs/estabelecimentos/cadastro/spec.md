## MODIFIED Requirements

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
