# Pendências

Itens deixados conscientemente pendentes durante o desenvolvimento — não são
tarefa imediata, mas precisam ser revisitados em algum momento. Cada entrada
tem o motivo de adiar e quando/como retomar.

## Revisão visual tela a tela vs. protótipo Pencil

**Quando:** mais pro final do MVP, quando a maioria (ou todas) das telas já
estiverem implementadas e integradas com o backend. Revisar tudo de uma vez
rende mais do que ajustar telas isoladas enquanto a estrutura delas ainda
pode mudar.

**O que fazer:** comparar cada tela implementada lado a lado com o frame
correspondente no protótipo (`~/IFSP/Downloads/updated/pencil-design-apresentacao.pen`,
via MCP `pencil`), conferindo:

- Tamanho de fonte (`font-size`) de títulos, textos e labels
- Peso de fonte (`font-weight`)
- Tamanho de imagens (logo, ícones, avatares, imagens de alimento)
- Posicionamento e alinhamento de elementos (espaçamento, ordem)

**Contexto:** ao longo do desenvolvimento já ficou claro que vários valores
não batem 1:1 com o protótipo. Nem todo desvio é acidental — o F1/F2, por
exemplo, trocou os `px` literais do protótipo pelos passos padrão do
Tailwind/shadcn a pedido do Andre, porque os valores do protótipo (pensado
pra um frame de 1280px) ficaram grandes demais na viewport real (ver decisão
de design da change arquivada `frontend-login`). Sem uma revisão dedicada,
não dá pra distinguir esses ajustes intencionais de drift acumulado nas
telas seguintes — daí esperar até ter mais telas prontas pra revisar tudo
com o mesmo critério de uma vez.
