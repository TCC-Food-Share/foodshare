## Purpose

Permitir que um estabelecimento já cadastrado atualize seus próprios dados cadastrais editáveis (contato, imagem, descrição e endereço) sem precisar recriar o cadastro.

## ADDED Requirements

### Requirement: Edição de dados cadastrais editáveis do estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado edite, em qualquer combinação, os seguintes dados do próprio cadastro: celular pessoal, celular institucional, e-mail institucional, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual.

#### Scenario: Edição de um único campo
- **WHEN** um estabelecimento autenticado envia a edição contendo apenas a descrição
- **THEN** o sistema atualiza somente a descrição e mantém os demais campos editáveis inalterados

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** um estabelecimento autenticado envia celular institucional, imagem e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados do estabelecimento (sem a senha)

#### Scenario: Endereço enviado como unidade completa
- **WHEN** um estabelecimento autenticado envia apenas parte dos campos de endereço (ex: só a cidade, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

### Requirement: Validação de formato na edição do estabelecimento
O sistema SHALL validar o formato de cada campo editável enviado, usando as mesmas regras de formato aplicadas no cadastro (RF01), e SHALL rejeitar a edição inteira sem persistir nenhuma alteração quando algum campo enviado estiver em formato inválido.

#### Scenario: Campo em formato inválido
- **WHEN** um estabelecimento autenticado envia um campo em formato inválido (ex: estado fora da sigla de 2 letras, CEP fora do formato esperado)
- **THEN** o sistema rejeita a edição, informa quais campos são inválidos e não altera nenhum dado

### Requirement: Campos não editáveis ignorados na edição do estabelecimento
O sistema SHALL ignorar, sem rejeitar a submissão só por causa disso, qualquer campo fora da lista de campos editáveis (ex: razão social, CNPJ, e-mail pessoal, nome do responsável, nome fantasia, senha) presente no corpo da requisição de edição.

#### Scenario: Submissão inclui campo não editável
- **WHEN** um estabelecimento autenticado envia, junto com campos editáveis válidos, um valor para CNPJ ou razão social
- **THEN** o sistema aplica normalmente os campos editáveis válidos e mantém CNPJ e razão social com o valor já cadastrado

### Requirement: Edição restrita à própria conta autenticada
O sistema SHALL determinar qual cadastro será editado exclusivamente a partir da sessão autenticada, nunca a partir de um identificador informado pelo cliente, e SHALL rejeitar qualquer tentativa de edição sem autenticação válida.

#### Scenario: Requisição sem autenticação
- **WHEN** uma edição é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não altera nenhum dado

#### Scenario: Edição sempre aplicada à conta autenticada
- **WHEN** um estabelecimento autenticado envia uma edição
- **THEN** o sistema aplica as alterações exclusivamente ao cadastro do estabelecimento autenticado, independentemente de qualquer identificador de outra conta presente na requisição

### Requirement: Unicidade de contato na edição do estabelecimento
O sistema SHALL rejeitar a edição, sem persistir nenhuma alteração, quando o celular pessoal, o celular institucional ou o e-mail institucional informado já pertencer a outro cadastro.

#### Scenario: Novo celular institucional já usado por outro cadastro
- **WHEN** um estabelecimento autenticado edita o celular institucional para um valor já usado por outro estabelecimento ou entidade beneficiária
- **THEN** o sistema rejeita a edição, informa que o campo já está em uso e não altera nenhum dado

#### Scenario: Novos valores de contato sem conflito
- **WHEN** um estabelecimento autenticado edita celular pessoal, celular institucional ou e-mail institucional para valores inéditos
- **THEN** o sistema aplica a edição normalmente

### Requirement: Atomicidade da edição do estabelecimento
O sistema SHALL aplicar as atualizações de usuário, endereço e estabelecimento envolvidas em uma edição como uma única operação atômica: se qualquer parte falhar, nenhuma alteração parcial permanece persistida.

#### Scenario: Falha durante a atualização
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades afetadas pela edição (usuário, endereço ou estabelecimento)
- **THEN** o sistema não deixa nenhuma alteração parcial persistida e retorna erro ao cliente
