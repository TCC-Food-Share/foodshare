# arquivos/imagens Specification

## Purpose

Receber, validar, guardar e servir as imagens enviadas à plataforma, com limite de tamanho e conferência do tipo real do arquivo, sem expor o armazenamento ao público.

## Requirements

### Requirement: Validação da imagem enviada
O sistema SHALL aceitar como imagem apenas arquivos de no máximo 5 MB cujo conteúdo seja JPEG, PNG ou WebP. O tipo SHALL ser determinado pelo conteúdo do arquivo, não pela extensão do nome nem pelo tipo declarado pelo cliente. Uma imagem recusada SHALL fazer a requisição inteira ser rejeitada com `400`, sem persistir nenhuma alteração, e a resposta SHALL trazer a `code` do motivo: `IMAGE_TOO_LARGE` para tamanho acima do limite e `IMAGE_INVALID_TYPE` para tipo fora dos aceitos.

#### Scenario: Imagem válida
- **WHEN** uma requisição envia um arquivo PNG de 2 MB como imagem
- **THEN** o sistema aceita a imagem e segue com o processamento da requisição

#### Scenario: Imagem acima de 5 MB
- **WHEN** uma requisição envia um arquivo JPEG de 6 MB como imagem
- **THEN** o sistema rejeita a requisição com `400` e `code` `IMAGE_TOO_LARGE`, sem gravar o arquivo nem alterar nenhum dado

#### Scenario: Imagem com exatamente 5 MB
- **WHEN** uma requisição envia um arquivo WebP de exatamente 5 MB (5.242.880 bytes) como imagem
- **THEN** o sistema aceita a imagem

#### Scenario: Formato fora dos aceitos
- **WHEN** uma requisição envia um arquivo GIF como imagem
- **THEN** o sistema rejeita a requisição com `400` e `code` `IMAGE_INVALID_TYPE`, sem gravar o arquivo nem alterar nenhum dado

#### Scenario: Extensão que não corresponde ao conteúdo
- **WHEN** uma requisição envia um arquivo PDF renomeado para `foto.png`, declarado como `image/png`
- **THEN** o sistema rejeita a requisição com `400` e `code` `IMAGE_INVALID_TYPE`, sem gravar o arquivo nem alterar nenhum dado

### Requirement: Armazenamento privado da imagem
O sistema SHALL guardar cada imagem aceita no armazenamento de arquivos do próprio ambiente, que não é acessível publicamente. O banco de dados SHALL guardar apenas a chave do arquivo, nunca o arquivo nem uma URL completa. A chave SHALL ser gerada pelo sistema, única, e nunca reaproveitada para outro arquivo. O nome de arquivo informado pelo cliente SHALL ser ignorado.

#### Scenario: Chave gerada pelo sistema
- **WHEN** uma imagem chamada `logo da empresa.png` é aceita para um usuário
- **THEN** o sistema grava o arquivo sob uma chave nova, gerada por ele, sem usar o nome enviado, e o banco guarda essa chave na imagem do usuário

#### Scenario: Duas imagens com o mesmo nome
- **WHEN** duas imagens com o mesmo nome de arquivo são aceitas
- **THEN** cada uma é gravada sob uma chave diferente, e nenhuma sobrescreve a outra

### Requirement: Leitura da imagem pela API
O sistema SHALL servir cada imagem guardada por uma rota da API, identificada pela chave, a qualquer usuário autenticado (estabelecimento, entidade beneficiária ou administrador). A resposta SHALL trazer o tipo de conteúdo do arquivo e permitir cache longo pelo navegador, já que o conteúdo de uma chave nunca muda. A rota SHALL rejeitar requisições sem sessão e SHALL responder `404` para chave inexistente ou fora do formato de chave gerado pelo sistema, sem ler nada fora das imagens guardadas.

#### Scenario: Leitura com sessão
- **WHEN** um usuário autenticado pede a imagem de uma chave existente
- **THEN** o sistema devolve o arquivo com o tipo de conteúdo correspondente (ex.: `image/png`) e cabeçalho de cache longo

#### Scenario: Leitura sem sessão
- **WHEN** uma requisição sem sessão autenticada pede a imagem de uma chave existente
- **THEN** o sistema rejeita a requisição e não devolve o arquivo

#### Scenario: Chave inexistente
- **WHEN** um usuário autenticado pede a imagem de uma chave em formato válido que não existe no armazenamento
- **THEN** o sistema responde `404`

#### Scenario: Chave fora do formato
- **WHEN** um usuário autenticado pede a imagem de uma chave fora do formato gerado pelo sistema (ex.: com `..` ou um prefixo desconhecido)
- **THEN** o sistema responde `404` sem consultar o armazenamento

### Requirement: URL da imagem nas respostas da API
Toda resposta da API que inclui a imagem de um usuário SHALL trazê-la como a URL completa da rota de leitura de imagem para a chave guardada, pronta para o navegador usar. Quando o usuário não tem imagem, o campo SHALL vir `null`.

#### Scenario: Usuário com imagem
- **WHEN** a API devolve os dados de um usuário cuja imagem está guardada sob uma chave
- **THEN** o campo de imagem traz a URL completa da rota de leitura para essa chave, e não a chave sozinha

#### Scenario: Usuário sem imagem
- **WHEN** a API devolve os dados de um usuário sem imagem
- **THEN** o campo de imagem vem `null`

#### Scenario: Sessão atual
- **WHEN** um usuário autenticado com imagem consulta a própria sessão
- **THEN** a imagem do usuário na resposta da sessão vem como a URL completa da rota de leitura

### Requirement: Seleção de imagem no frontend
O frontend SHALL oferecer um único componente de seleção de imagem, usado onde a interface pede uma imagem. O componente SHALL mostrar a prévia da imagem escolhida, permitir trocá-la por outra antes de enviar e recusar, antes de qualquer envio, arquivos acima de 5 MB ou fora de JPEG, PNG e WebP, com uma mensagem que diga o motivo. Quando o servidor rejeitar a imagem, o frontend SHALL mostrar a mensagem correspondente à `code` devolvida.

#### Scenario: Escolha de uma imagem válida
- **WHEN** o usuário escolhe um arquivo PNG de 1 MB no componente
- **THEN** o componente mostra a prévia da imagem e a mantém selecionada para o envio

#### Scenario: Arquivo grande demais
- **WHEN** o usuário escolhe um arquivo de 8 MB no componente
- **THEN** o componente recusa o arquivo, informa que o limite é 5 MB e não o envia

#### Scenario: Formato não aceito
- **WHEN** o usuário escolhe um arquivo GIF ou PDF no componente
- **THEN** o componente recusa o arquivo, informa os formatos aceitos (JPEG, PNG ou WebP) e não o envia

#### Scenario: Troca da imagem escolhida
- **WHEN** o usuário já escolheu uma imagem e escolhe outra
- **THEN** o componente substitui a prévia pela nova imagem, e só a nova é enviada

#### Scenario: Rejeição pelo servidor
- **WHEN** o servidor rejeita a imagem com `code` `IMAGE_INVALID_TYPE`
- **THEN** o frontend mostra, junto do componente, a mensagem de formato não aceito
