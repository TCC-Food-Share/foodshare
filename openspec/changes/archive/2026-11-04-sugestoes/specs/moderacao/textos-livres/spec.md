## MODIFIED Requirements

### Requirement: Campos de texto livre validados

O sistema SHALL validar o conteúdo dos seguintes campos, sempre que enviados: descrição e nome fantasia no cadastro de estabelecimento e de entidade beneficiária; descrição na edição de estabelecimento e de entidade beneficiária; descrição e observações no cadastro de alimento; texto da sugestão de nova opção. Campo opcional não enviado ou vazio SHALL ser aceito. Razão social, nome do responsável e endereço SHALL NOT passar por esta validação.

#### Scenario: Cadastro de instituição com termo proibido na descrição

- **WHEN** uma submissão de cadastro de estabelecimento ou de entidade beneficiária traz um termo proibido na descrição
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, sem criar conta nem gravar a imagem

#### Scenario: Cadastro de instituição com termo proibido no nome fantasia

- **WHEN** uma submissão de cadastro traz um termo proibido no nome fantasia
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, informando o campo `tradeName`

#### Scenario: Edição de instituição com termo proibido na descrição

- **WHEN** uma instituição autenticada envia uma edição com termo proibido na descrição, junto de outros campos válidos
- **THEN** o sistema recusa a edição inteira com `400` e `code` `PROHIBITED_CONTENT` e não altera nenhum dado, nem a imagem

#### Scenario: Cadastro de alimento com termo proibido

- **WHEN** um estabelecimento cadastra um alimento com termo proibido na descrição ou nas observações
- **THEN** o sistema recusa o cadastro com `400` e `code` `PROHIBITED_CONTENT`, sem criar o alimento nem gravar a imagem

#### Scenario: Alimento sem observações

- **WHEN** um estabelecimento cadastra um alimento válido sem observações
- **THEN** o sistema cria o alimento normalmente

#### Scenario: Campo fora da validação

- **WHEN** uma submissão de cadastro traz um termo proibido apenas na razão social
- **THEN** o sistema não recusa o cadastro por esse motivo

#### Scenario: Sugestão com termo proibido ou link

- **WHEN** uma instituição envia uma sugestão com termo proibido ou link no texto
- **THEN** o sistema recusa a sugestão com `400` e `code` `PROHIBITED_CONTENT`, informando o campo `text`, sem gravar nada
