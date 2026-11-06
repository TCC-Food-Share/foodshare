## ADDED Requirements

### Requirement: Quantidade máxima do alimento

O sistema SHALL recusar, como dado inválido, quantidade maior que 99.999.999,99, o maior valor que o estoque do alimento comporta. A regra SHALL valer para o cadastro, a edição, a reativação e a prévia do efeito da nova quantidade. O formulário SHALL mostrar a mensagem no campo, antes do envio.

#### Scenario: Maior quantidade aceita

- **WHEN** o estabelecimento informa a quantidade 99.999.999,99 numa unidade que aceita fração
- **THEN** o sistema não recusa a quantidade por tamanho

#### Scenario: Quantidade acima do limite na edição

- **WHEN** o estabelecimento edita um alimento informando a quantidade 100.000.000
- **THEN** o sistema responde `400` como dado inválido, nada muda, e não ocorre erro interno

#### Scenario: Quantidade acima do limite no cadastro

- **WHEN** o estabelecimento cadastra um alimento com quantidade 100.000.000
- **THEN** o sistema responde `400` como dado inválido e não cria o alimento

#### Scenario: Aviso no formulário

- **WHEN** o estabelecimento digita uma quantidade acima do limite no cadastro, na edição ou na reativação
- **THEN** o campo mostra "A quantidade máxima é 99.999.999,99." antes do envio
