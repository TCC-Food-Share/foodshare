## MODIFIED Requirements

### Requirement: URL da imagem nas respostas da API

Toda resposta da API que inclui a imagem de um usuário ou de um alimento SHALL trazê-la como a URL completa da rota de leitura de imagem para a chave guardada, pronta para o navegador usar. Quando não há imagem, o campo SHALL vir `null`. As imagens de alimento SHALL ficar na pasta `foods` do armazenamento.

#### Scenario: Usuário com imagem

- **WHEN** a API devolve os dados de um usuário cuja imagem está guardada sob uma chave
- **THEN** o campo de imagem traz a URL completa da rota de leitura para essa chave, e não a chave sozinha

#### Scenario: Usuário sem imagem

- **WHEN** a API devolve os dados de um usuário sem imagem
- **THEN** o campo de imagem vem `null`

#### Scenario: Sessão atual

- **WHEN** um usuário autenticado com imagem consulta a própria sessão
- **THEN** a imagem do usuário na resposta da sessão vem como a URL completa da rota de leitura

#### Scenario: Imagem de alimento

- **WHEN** a API devolve um alimento no cadastro, na listagem, no detalhe ou dentro de um pedido
- **THEN** a imagem do alimento vem como a URL completa da rota de leitura para uma chave da pasta `foods`
