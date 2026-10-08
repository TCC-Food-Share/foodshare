## Purpose

Definir a estrutura da área administrativa na interface: para onde o administrador vai depois do login, o layout com menu lateral e as seções que as fases seguintes vão preencher (RF06, RF07).

## ADDED Requirements

### Requirement: Entrada do administrador após o login
Após um login bem-sucedido, a interface SHALL levar o administrador para `/admin` e as instituições para o feed, como antes. Um administrador que já tem sessão e abre a tela de login SHALL ser levado para `/admin`.

#### Scenario: Login do administrador
- **WHEN** um administrador faz login com e-mail e senha corretos
- **THEN** a interface abre a área administrativa em `/admin`

#### Scenario: Login de instituição
- **WHEN** um estabelecimento ou entidade beneficiária faz login com e-mail e senha corretos
- **THEN** a interface abre o feed, como antes

#### Scenario: Administrador já autenticado abre o login
- **WHEN** um administrador com sessão válida abre a tela de login
- **THEN** a interface o leva para `/admin`

### Requirement: Layout do painel com menu lateral
A área administrativa SHALL ter um layout próprio, separado do layout das instituições, com o nome "Food Share", um menu lateral e o acesso ao encerramento da sessão. O menu SHALL conter, nesta ordem, os grupos e itens: **Gestão** — Administradores, Instituições, Alimentos, Pedidos, Sugestões; **Listas padronizadas** — Categorias, Catálogo de alimentos, Unidades de medida, Motivos de cancelamento, Termos proibidos. O item da seção aberta SHALL aparecer destacado. Em telas estreitas (até 400 px), o menu SHALL ficar acessível sem sobrepor o conteúdo de forma permanente.

#### Scenario: Administrador vê o menu completo
- **WHEN** um administrador abre a área administrativa
- **THEN** o menu lateral mostra os dez itens nos dois grupos, na ordem definida

#### Scenario: Item da seção atual destacado
- **WHEN** o administrador abre a seção "Categorias"
- **THEN** o item "Categorias" aparece destacado no menu e os demais não

#### Scenario: Menu em tela estreita
- **WHEN** a área administrativa é aberta numa tela de 400 px de largura
- **THEN** o conteúdo da seção ocupa a largura da tela e o menu abre e fecha por um botão

### Requirement: Seções ainda vazias
Cada item do menu SHALL abrir uma seção própria, com endereço próprio sob `/admin/...`, título da seção e um aviso de que a funcionalidade ainda está em construção. A entrada `/admin` SHALL exibir uma página inicial com uma saudação ao administrador. Endereços `/admin/...` que não correspondem a nenhuma seção SHALL levar para `/admin`.

#### Scenario: Seção ainda não implementada
- **WHEN** o administrador abre a seção "Pedidos"
- **THEN** a interface mostra o título "Pedidos" e o aviso de que a funcionalidade está em construção, sem erro

#### Scenario: Endereço administrativo inexistente
- **WHEN** o administrador abre um endereço `/admin/...` que não é uma seção do menu
- **THEN** a interface o leva para `/admin`

### Requirement: Logout a partir do painel
O administrador SHALL poder encerrar a sessão a partir da área administrativa, sendo levado para a tela de login. Depois disso, a área administrativa NÃO SHALL ser acessível sem novo login.

#### Scenario: Administrador encerra a sessão
- **WHEN** o administrador escolhe "Sair" no painel
- **THEN** a sessão é encerrada e a interface abre a tela de login

#### Scenario: Painel após o logout
- **WHEN** depois do logout alguém abre `/admin`
- **THEN** a interface redireciona para o login
