# admin/acesso Specification

## Purpose

Definir o papel de Administrador, como o primeiro administrador passa a existir e como o sistema separa o que cada papel pode acessar: a área administrativa só para administradores e as funcionalidades de instituição só para instituições (RF06, RN34, `docs/CONVENCOES.md`).

## Requirements

### Requirement: Papel de administrador
O sistema SHALL reconhecer três papéis de usuário: "Establishment", "BeneficiaryEntity" e "Administrator". Os três SHALL ser criados pela carga inicial do banco, sem cadastro manual. Um administrador NÃO tem estabelecimento nem entidade beneficiária vinculados e NÃO precisa de celular pessoal.

#### Scenario: Banco recém-criado tem os três papéis
- **WHEN** o banco é criado do zero e a carga inicial é executada
- **THEN** existem os papéis "Establishment", "BeneficiaryEntity" e "Administrator"

#### Scenario: Carga inicial executada duas vezes
- **WHEN** a carga inicial é executada novamente sobre um banco que já tem os três papéis
- **THEN** o conjunto de papéis continua o mesmo, sem duplicatas

#### Scenario: Sessão do administrador informa o papel
- **WHEN** um administrador autenticado consulta os dados da própria sessão
- **THEN** o sistema retorna o papel "Administrator" junto com nome e e-mail, sem senha

#### Scenario: Celular pessoal continua obrigatório para instituições
- **WHEN** um estabelecimento ou entidade beneficiária tenta se cadastrar sem celular pessoal
- **THEN** o sistema recusa o cadastro por entrada inválida, como antes

### Requirement: Primeiro administrador criado pela carga inicial
A carga inicial do banco SHALL criar um administrador a partir das variáveis de ambiente de nome, e-mail e senha do primeiro administrador, somente quando ainda não existir nenhum usuário com o papel "Administrator". A senha SHALL ser guardada da mesma forma que a das demais contas, de modo que o login com ela funcione normalmente. Quando as variáveis não estiverem definidas, a carga inicial SHALL pular esse passo, emitir um aviso e concluir sem erro.

#### Scenario: Banco sem administrador e variáveis definidas
- **WHEN** a carga inicial roda com as três variáveis definidas e nenhum administrador no banco
- **THEN** é criado um administrador com o nome e o e-mail informados, que consegue fazer login com a senha informada

#### Scenario: Já existe administrador
- **WHEN** a carga inicial roda com as variáveis definidas e já existe pelo menos um administrador
- **THEN** nenhum administrador novo é criado e os existentes não são alterados

#### Scenario: Variáveis ausentes
- **WHEN** a carga inicial roda sem alguma das três variáveis
- **THEN** nenhum administrador é criado, um aviso é emitido e o restante da carga inicial é concluído

### Requirement: Área administrativa restrita ao administrador
Toda rota da API sob o prefixo `/admin` SHALL exigir sessão válida de um usuário com o papel "Administrator". Sem sessão, a resposta SHALL ser `401`. Com sessão de estabelecimento ou entidade beneficiária, a resposta SHALL ser `403` com `code: ROLE_NOT_ALLOWED`, sem executar a operação.

#### Scenario: Administrador acessa rota administrativa
- **WHEN** um administrador autenticado chama uma rota sob `/admin`
- **THEN** o sistema processa a requisição normalmente

#### Scenario: Instituição tenta acessar rota administrativa
- **WHEN** um estabelecimento ou entidade beneficiária autenticado chama qualquer rota sob `/admin`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED` e não executa a operação

#### Scenario: Requisição sem sessão a rota administrativa
- **WHEN** uma requisição sem sessão válida chama uma rota sob `/admin`
- **THEN** o sistema responde `401`

### Requirement: Funcionalidades de instituição restritas a instituições
As rotas de alimentos, pedidos, categorias e de consulta e edição do próprio cadastro de estabelecimento e de entidade beneficiária SHALL recusar o administrador com `403` e `code: ROLE_NOT_ALLOWED`. A consulta dos dados da própria sessão SHALL continuar disponível para qualquer usuário autenticado, e o cadastro de instituição continua público.

#### Scenario: Administrador tenta ver o feed de alimentos
- **WHEN** um administrador autenticado consulta a listagem pública de alimentos
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Administrador tenta listar pedidos
- **WHEN** um administrador autenticado consulta a listagem de pedidos de instituição
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Administrador consulta a própria sessão
- **WHEN** um administrador autenticado consulta os dados da própria sessão
- **THEN** o sistema responde normalmente

#### Scenario: Instituição continua usando as próprias rotas
- **WHEN** um estabelecimento ou entidade beneficiária autenticado usa o feed, os pedidos, as categorias ou o próprio cadastro
- **THEN** o comportamento é o mesmo de antes desta mudança

### Requirement: Separação de áreas na interface
Na interface, o administrador SHALL usar somente a área administrativa (`/admin/...`), e as instituições SHALL usar somente as telas de instituição. Ao abrir uma tela da outra área, o usuário SHALL ser redirecionado para a entrada da própria área, sem ver o conteúdo da tela pedida.

#### Scenario: Instituição abre endereço do painel
- **WHEN** um estabelecimento ou entidade beneficiária autenticado abre qualquer endereço `/admin/...`
- **THEN** a interface o redireciona para o feed

#### Scenario: Administrador abre tela de instituição
- **WHEN** um administrador autenticado abre o feed, a listagem ou o detalhe de pedidos, o detalhe de alimento ou o perfil de instituição
- **THEN** a interface o redireciona para `/admin`

#### Scenario: Visitante sem sessão abre o painel
- **WHEN** um visitante sem sessão abre qualquer endereço `/admin/...`
- **THEN** a interface o redireciona para o login
