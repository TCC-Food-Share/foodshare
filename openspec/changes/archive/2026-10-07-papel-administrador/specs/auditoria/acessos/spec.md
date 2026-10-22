## Purpose

Registrar cada requisição feita à API, com quem fez, de onde e com qual resultado, para manutenção, suporte técnico e rastreio de ações (RNF13, DT19).

## ADDED Requirements

### Requirement: Registro de toda requisição
O sistema SHALL gravar um registro de acesso para cada requisição HTTP atendida pela API, inclusive login e logout e inclusive requisições recusadas (`401`, `403`, `4xx`, `5xx`). Cada registro SHALL conter: método, caminho (sem a query string), código de status da resposta, duração em milissegundos, IP de origem do cliente, user agent, data e hora e o usuário autenticado, quando houver. Ficam de fora apenas as requisições de pré-voo do CORS (`OPTIONS`), a verificação de saúde (`/health`) e a documentação da API (`/docs`, `/openapi`).

#### Scenario: Requisição autenticada
- **WHEN** um usuário autenticado faz uma requisição à API
- **THEN** é gravado um registro de acesso com o identificador desse usuário, o método, o caminho, o status, a duração, o IP e o user agent

#### Scenario: Requisição sem sessão
- **WHEN** uma requisição sem sessão é recusada com `401`
- **THEN** é gravado um registro de acesso com status `401` e sem usuário

#### Scenario: Login bem-sucedido
- **WHEN** um usuário faz login com credenciais corretas
- **THEN** o registro de acesso do login traz o identificador do usuário que acabou de entrar

#### Scenario: Login recusado
- **WHEN** uma tentativa de login é recusada por credencial inválida
- **THEN** é gravado um registro de acesso com o status de recusa e sem usuário

#### Scenario: Requisição excluída do registro
- **WHEN** o monitoramento chama a verificação de saúde, ou o navegador envia um pré-voo `OPTIONS`
- **THEN** nenhum registro de acesso é gravado

### Requirement: IP real do cliente atrás do proxy
O IP gravado SHALL ser o do cliente que originou a requisição, e não o do proxy reverso do ambiente.

#### Scenario: Requisição no staging atrás do proxy
- **WHEN** um usuário acessa a API no staging, que fica atrás de um proxy reverso
- **THEN** o registro de acesso traz o IP do usuário, não o IP interno do proxy

### Requirement: Registro não afeta a resposta
A gravação do registro de acesso NÃO SHALL atrasar nem alterar a resposta da requisição. Se a gravação falhar, o sistema SHALL registrar o erro no log da aplicação e a resposta ao cliente SHALL permanecer a mesma.

#### Scenario: Falha ao gravar o registro de acesso
- **WHEN** a gravação de um registro de acesso falha
- **THEN** o cliente recebe a mesma resposta que receberia sem a falha, e o erro aparece no log da aplicação

### Requirement: Registro de acesso não guarda segredos
O registro de acesso NÃO SHALL guardar corpo de requisição ou de resposta, cookies, cabeçalhos de autenticação nem a query string.

#### Scenario: Login com senha no corpo
- **WHEN** um usuário faz login enviando e-mail e senha
- **THEN** o registro de acesso não contém a senha, o e-mail nem o cookie de sessão emitido
