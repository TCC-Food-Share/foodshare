# Pendências

Itens deixados pendentes de propósito: não são tarefa imediata, mas
precisam ser retomados em algum momento. Cada entrada diz por que ficou para
depois e quando ou como retomar.

## Número de WhatsApp dedicado (P01)

**Situação:** os lembretes (RF73, RF74) são implementados na fase 6.2, mas
ficam desligados (`N8N_WEBHOOK_URL` vazio) até existir um número próprio do
Food Share conectado ao n8n.

**O que fazer:**
- Comprar um chip pré-pago.
- Conectar o número no n8n.
- Criar o fluxo que recebe o webhook (validando o `X-Webhook-Secret`) e envia a mensagem.
- Preencher as variáveis no Coolify.

Manter o chip com recarga periódica, para a operadora não cancelar a linha.

**Não fazer:** usar um número pessoal. Mensagem automática para números
desconhecidos é o cenário que mais leva o WhatsApp a banir o número.

## Revisão visual tela a tela vs. protótipo Pencil

**Quando:** fase 7.1 do `docs/PLANO-IMPLEMENTACAO.md`, com todas as telas
prontas. Revisar tudo de uma vez rende mais do que ajustar telas isoladas
enquanto a estrutura delas ainda pode mudar.

**O que fazer:** comparar cada tela com o frame correspondente do
protótipo (`pencil-design-apresentacao.pen`, via MCP `pencil`), conferindo:

- tamanho de fonte (`font-size`) de títulos, textos e labels;
- peso de fonte (`font-weight`);
- tamanho de imagens (logo, ícones, avatares, imagens de alimento);
- posicionamento e alinhamento (espaçamento, ordem).

**Contexto:** vários valores não batem 1:1 com o protótipo, e nem todo
desvio é acidental. O MVP trocou os `px` literais do protótipo (pensado para
um frame de 1280 px) pelos passos padrão do Tailwind/shadcn, porque ficavam
grandes demais na viewport real (decisão da change arquivada
`frontend-login`). A revisão precisa separar esses ajustes intencionais do
desvio acumulado, com o mesmo critério para todas as telas.

## Tela de consulta da auditoria (opcional)

**Situação:** a auditoria é gravada em `audit_log` desde a fase 0.2, mas sem
tela (DT09).

**Quando:** só se sobrar tempo depois da fase 7.2. Uma tabela somente
leitura no painel, com filtros por administrador, ação e período, usando a
tabela administrativa da fase 1.3. Funciona bem na apresentação.

## Dashboard do administrador (opcional)

**Situação:** o protótipo tem um dashboard, mas nenhum RF pede um.

**Quando:** só se sobrar tempo. Indicadores simples (alimentos ativos,
pedidos por status, doações concluídas no mês, sugestões pendentes), sem
biblioteca de gráficos nova se der para evitar.

## Antes de tornar o repositório público

**Situação:** há a intenção de tornar o repositório público no GitHub.

**O que fazer antes:**
- Conferir se nenhum segredo (chaves, senhas, `.env`) entrou no histórico do git. Se entrou, trocar o segredo no serviço; apagar do histórico não basta.
- Revisar os `.env.example`.
