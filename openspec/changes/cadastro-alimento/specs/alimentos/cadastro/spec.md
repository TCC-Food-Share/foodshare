## Purpose

Permitir que um estabelecimento autenticado cadastre um alimento vinculado ao próprio cadastro, viabilizando os demais fluxos do MVP que dependem de alimento disponível (listagem, busca, pedido).

## ADDED Requirements

### Requirement: Cadastro de alimento pelo estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado cadastre um alimento informando imagem, nome, categoria, quantidade (valor numérico e unidade de medida), descrição e data de vencimento, vinculado exclusivamente ao próprio cadastro.

#### Scenario: Cadastro com todos os dados válidos
- **WHEN** um estabelecimento autenticado envia imagem, nome, categoria, quantidade, unidade, descrição e data de vencimento válidos
- **THEN** o sistema cria o alimento vinculado ao estabelecimento autenticado e retorna confirmação com os dados do alimento

#### Scenario: Campo obrigatório ausente ou em formato inválido
- **WHEN** um estabelecimento autenticado envia a submissão sem um campo obrigatório, ou com um campo em formato inválido (ex: categoria inexistente, quantidade negativa)
- **THEN** o sistema rejeita o cadastro e informa quais campos são inválidos, sem criar nenhum registro

#### Scenario: Cadastro restrito à própria conta autenticada
- **WHEN** um estabelecimento autenticado cadastra um alimento
- **THEN** o sistema vincula o alimento exclusivamente ao estabelecimento autenticado, independentemente de qualquer identificador de outro estabelecimento presente na requisição

#### Scenario: Requisição sem autenticação
- **WHEN** uma requisição de cadastro de alimento é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não cria nenhum registro

#### Scenario: Conta autenticada não é um estabelecimento
- **WHEN** uma entidade beneficiária autenticada tenta cadastrar um alimento
- **THEN** o sistema rejeita a requisição, sem criar nenhum registro

### Requirement: Alimento cadastrado inicia com status "Revisar"
O sistema SHALL atribuir automaticamente o status "Revisar" a todo alimento no momento do cadastro, sem permitir que o cliente informe ou escolha o status inicial.

#### Scenario: Status inicial automático
- **WHEN** um estabelecimento autenticado cadastra um alimento com todos os dados válidos
- **THEN** o sistema atribui o status "Revisar" ao alimento criado, independentemente de qualquer valor de status presente na requisição
