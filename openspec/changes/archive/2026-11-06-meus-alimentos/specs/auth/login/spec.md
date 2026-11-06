## ADDED Requirements

### Requirement: Falha ao carregar a sessão no frontend

Ao abrir o app, o frontend SHALL tratar a falha ao consultar a sessão atual: resposta `401` continua significando "sem sessão"; qualquer outra falha (limite de requisições excedido, erro do servidor ou falta de conexão) SHALL mostrar uma tela de erro com a ação "Tentar novamente", em vez de ficar carregando indefinidamente.

#### Scenario: Limite de requisições excedido

- **WHEN** a consulta da sessão responde `429`
- **THEN** o app mostra "Não foi possível carregar o Food Share." e pede para aguardar um instante antes de tentar de novo

#### Scenario: Sem conexão ou erro do servidor

- **WHEN** a consulta da sessão falha por falta de conexão ou erro do servidor
- **THEN** o app mostra a tela de erro e pede para verificar a conexão

#### Scenario: Tentar novamente

- **WHEN** a pessoa clica em "Tentar novamente" e a consulta da sessão funciona
- **THEN** o app carrega a página em que ela estava, com a sessão dela

#### Scenario: Sem sessão continua indo para o login

- **WHEN** a consulta da sessão responde `401`
- **THEN** o app trata como sessão ausente e leva às telas públicas, sem mostrar a tela de erro
