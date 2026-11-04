## Why

As cinco listas padronizadas (categorias, catálogo, unidades, motivos de
cancelamento e termos proibidos) existem no banco desde a 1.1, mas só mudam
pelo seed. O administrador precisa gerenciá-las pelo painel (RF33–RF40,
RF59–RF70), e as changes seguintes dependem disso: a validação de termos
proibidos (1.4) lê a lista que o administrador mantém, e as sugestões (1.5)
criam opções nessas listas. É o item 1.3 de `docs/PLANO-IMPLEMENTACAO.md`.

## What Changes

- **Backend:** rotas `/admin/...` de listagem, cadastro, edição e exclusão
  para as cinco listas, só para administradores:
  - `/admin/categories`
  - `/admin/food-items`
  - `/admin/measurement-units`
  - `/admin/cancellation-reasons`
  - `/admin/prohibited-terms`
- **Listagem:** paginada no padrão do projeto (`page`, `pageSize`,
  `{ data, total, page, pageSize }`), com busca sem acento por
  identificador e pelos campos de texto de cada lista, e ordenação por
  campo (`sort`, `order`). Cada linha traz quantas vezes a opção está em
  uso.
- **Regras de escrita:**
  - nome (e sigla, nas unidades) único sem maiúsculas nem acentos, com
    `409` e `code` próprio (RN37);
  - exclusão bloqueada se a opção estiver em uso, com `409` e
    `code: OPTION_IN_USE` (RN37); termos proibidos não têm vínculo (RF69);
  - motivos de sistema não podem ser editados nem excluídos (RN31,
    `code: SYSTEM_REASON_PROTECTED`);
  - **desmarcar "aceita fração" numa unidade é bloqueado enquanto houver
    alimento não excluído com quantidade fracionada nela**
    (`code: FRACTION_IN_USE`, decidido nesta proposta, vira a DT22);
  - termo proibido gravado normalizado (minúsculas, sem acento);
  - o cadastro guarda o administrador criador;
  - toda escrita grava auditoria na mesma transação (RN46).
- **Frontend:** as cinco seções do painel deixam de ser "em construção":
  - um componente genérico de tabela administrativa (busca, ordenação por
    coluna, paginação e ações por linha), reaproveitado na fase 5;
  - um diálogo de cadastro e edição por lista e um de confirmação de
    exclusão;
  - layout das telas "Admin Categorias" e "Admin Motivos de Cancelamento"
    do protótipo, estendido às outras três.
- **Paginação de todas as listagens (DT23, decidida na revisão):** feed,
  pedidos e tabelas do painel passam a oferecer 10, 20, 50 ou 100 itens por
  página, com padrão 10, num select na tela. `pageSize` fora desses valores
  responde `400`, em vez de ser reduzido ao teto. **BREAKING** para quem
  chamava a API com outros valores; o único cliente é o nosso frontend, que
  muda junto.
- **Docs:** DT22 e DT23 em `docs/REQUISITOS.md`; regra em
  `docs/CONVENCOES.md`.

## Cobertura

- **RF33–RF36** — categorias: cadastrar, editar, excluir (bloqueada com
  itens do catálogo) e listar com busca e ordenação.
- **RF37–RF40** — motivos de cancelamento: o mesmo, com os motivos de
  sistema protegidos e a exclusão bloqueada se houver pedido com o motivo.
- **RF59–RF62** — unidades de medida, com nome e sigla únicos.
- **RF63–RF66** — catálogo de alimentos, com categoria.
- **RF67–RF70** — termos proibidos.
- **RN31, RN37, RN46** — motivos de sistema, regras comuns das listas e
  auditoria.

## Fora desta change

- Validar textos livres com os termos proibidos (RNF07): 1.4.
- Sugestões de opções e a tela de sugestões (RF49, RF71): 1.5.
- Tela de consulta da auditoria: opcional, `docs/PENDENCIAS.md`.
- As outras seções do painel (administradores, instituições, alimentos,
  pedidos): fase 5.

## Perguntas em aberto

Nenhuma. A regra de fração foi decidida com a dupla e vira a DT22.

## Capabilities

### New Capabilities

- `admin/listas`: gestão das cinco listas padronizadas pelo administrador
  (rotas, regras de escrita, auditoria) e as telas do painel, com a tabela
  administrativa genérica.

### Modified Capabilities

- `admin/painel`: as cinco seções de listas padronizadas deixam de ser
  seções vazias.
- `alimentos/listagem`: itens por página de 10, 20, 50 ou 100, padrão 10, com
  select no feed.
- `pedidos/listagem`: a mesma regra, com select na listagem de pedidos.

## Impact

- **Backend:** módulo novo `admin/lists/` (controllers, services, DTOs),
  registrado no `AdminModule`. Usa `AuditService`, `normalizeText` e as
  constantes de motivos de sistema. Nenhuma mudança de schema: os índices
  únicos normalizados da 1.1 já garantem a unicidade.
- **Frontend:** `features/admin/lists/` (páginas, diálogos, API) e
  `components/admin-table.tsx`; `router.tsx` troca o placeholder dessas
  cinco seções pelas páginas novas.
- **Dependências:** nenhuma.
