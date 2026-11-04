## MODIFIED Requirements

### Requirement: Seções ainda vazias

Cada item do menu SHALL abrir uma seção própria, com endereço próprio sob `/admin/...`. As cinco seções do grupo **Listas padronizadas** (Categorias, Catálogo de alimentos, Unidades de medida, Motivos de cancelamento e Termos proibidos) SHALL mostrar a gestão da lista correspondente. As demais seções SHALL mostrar o título e um aviso de que a funcionalidade ainda está em construção. A entrada `/admin` SHALL exibir uma página inicial com uma saudação ao administrador. Endereços `/admin/...` que não correspondem a nenhuma seção SHALL levar para `/admin`.

#### Scenario: Seção ainda não implementada

- **WHEN** o administrador abre a seção "Pedidos"
- **THEN** a interface mostra o título "Pedidos" e o aviso de que a funcionalidade está em construção, sem erro

#### Scenario: Seção de lista padronizada

- **WHEN** o administrador abre a seção "Categorias"
- **THEN** a interface mostra a tabela de categorias, sem o aviso de "em construção"

#### Scenario: Endereço administrativo inexistente

- **WHEN** o administrador abre um endereço `/admin/...` que não é uma seção do menu
- **THEN** a interface o leva para `/admin`
