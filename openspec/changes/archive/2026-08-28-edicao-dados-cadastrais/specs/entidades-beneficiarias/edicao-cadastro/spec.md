## Purpose

Permitir que uma entidade beneficiária já cadastrada atualize seus próprios dados cadastrais editáveis (contato, imagem, descrição e endereço) sem precisar recriar o cadastro.

## ADDED Requirements

### Requirement: Edição de dados cadastrais editáveis da entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada edite, em qualquer combinação, os seguintes dados do próprio cadastro: celular pessoal, celular institucional, e-mail institucional, imagem, descrição e endereço (CEP, logradouro, número, complemento opcional, cidade, estado). Campos não enviados na submissão permanecem com o valor atual.

#### Scenario: Edição de um único campo
- **WHEN** uma entidade beneficiária autenticada envia a edição contendo apenas a imagem
- **THEN** o sistema atualiza somente a imagem e mantém os demais campos editáveis inalterados

#### Scenario: Edição de múltiplos campos em uma única submissão
- **WHEN** uma entidade beneficiária autenticada envia descrição, celular pessoal e endereço completo numa mesma submissão
- **THEN** o sistema atualiza todos os campos enviados de uma vez e retorna os dados atualizados da entidade beneficiária (sem a senha)

#### Scenario: Endereço enviado como unidade completa
- **WHEN** uma entidade beneficiária autenticada envia apenas parte dos campos de endereço (ex: só o CEP, sem os demais campos do endereço)
- **THEN** o sistema rejeita a edição informando que o endereço deve ser enviado completo, sem alterar nenhum campo

### Requirement: Validação de formato na edição da entidade beneficiária
O sistema SHALL validar o formato de cada campo editável enviado, usando as mesmas regras de formato aplicadas no cadastro (RF03), e SHALL rejeitar a edição inteira sem persistir nenhuma alteração quando algum campo enviado estiver em formato inválido.

#### Scenario: Campo em formato inválido
- **WHEN** uma entidade beneficiária autenticada envia um campo em formato inválido (ex: e-mail institucional sem `@`, estado fora da sigla de 2 letras)
- **THEN** o sistema rejeita a edição, informa quais campos são inválidos e não altera nenhum dado

### Requirement: Campos não editáveis rejeitados na edição da entidade beneficiária
O sistema SHALL rejeitar a submissão inteira, sem persistir nenhuma alteração, quando o corpo da requisição de edição contiver qualquer campo fora da lista de campos editáveis (ex: razão social, CNPJ, e-mail pessoal, nome do responsável, nome fantasia, senha).

#### Scenario: Submissão inclui campo não editável
- **WHEN** uma entidade beneficiária autenticada envia, junto com campos editáveis válidos, um valor para e-mail pessoal ou CNPJ
- **THEN** o sistema rejeita a edição inteira e não altera nenhum dado

### Requirement: Edição restrita à própria conta autenticada
O sistema SHALL determinar qual cadastro será editado exclusivamente a partir da sessão autenticada, nunca a partir de um identificador informado pelo cliente, e SHALL rejeitar qualquer tentativa de edição sem autenticação válida.

#### Scenario: Requisição sem autenticação
- **WHEN** uma edição é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não altera nenhum dado

#### Scenario: Edição sempre aplicada à conta autenticada
- **WHEN** uma entidade beneficiária autenticada envia uma edição
- **THEN** o sistema aplica as alterações exclusivamente ao cadastro da entidade beneficiária autenticada, independentemente de qualquer identificador de outra conta presente na requisição

### Requirement: Unicidade de contato na edição da entidade beneficiária
O sistema SHALL rejeitar a edição, sem persistir nenhuma alteração, quando o celular pessoal, o celular institucional ou o e-mail institucional informado já pertencer a outro cadastro.

#### Scenario: Novo e-mail institucional já usado por outro cadastro
- **WHEN** uma entidade beneficiária autenticada edita o e-mail institucional para um valor já usado por outra entidade beneficiária ou estabelecimento
- **THEN** o sistema rejeita a edição, informa que o campo já está em uso e não altera nenhum dado

#### Scenario: Novos valores de contato sem conflito
- **WHEN** uma entidade beneficiária autenticada edita celular pessoal, celular institucional ou e-mail institucional para valores inéditos
- **THEN** o sistema aplica a edição normalmente

### Requirement: Atomicidade da edição da entidade beneficiária
O sistema SHALL aplicar as atualizações de usuário, endereço e entidade beneficiária envolvidas em uma edição como uma única operação atômica: se qualquer parte falhar, nenhuma alteração parcial permanece persistida.

#### Scenario: Falha durante a atualização
- **WHEN** ocorre uma falha ao persistir qualquer uma das entidades afetadas pela edição (usuário, endereço ou entidade beneficiária)
- **THEN** o sistema não deixa nenhuma alteração parcial persistida e retorna erro ao cliente
