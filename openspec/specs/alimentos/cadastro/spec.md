# alimentos/cadastro Specification

## Purpose

Permitir que um estabelecimento autenticado cadastre um alimento vinculado ao próprio cadastro, viabilizando os demais fluxos que dependem de alimento disponível (listagem, busca, pedido).

## Requirements

### Requirement: Cadastro de alimento pelo estabelecimento

O sistema SHALL permitir que um estabelecimento autenticado cadastre um alimento informando, numa única submissão: imagem (arquivo), item do catálogo de alimentos, quantidade, unidade de medida (da lista de unidades), tipo de solicitação aceita ("Somente total", "Somente parcial" ou "Total ou parcial"), descrição e data de vencimento; e, opcionalmente, observações. O alimento SHALL ficar vinculado exclusivamente ao próprio cadastro. O nome e a categoria do alimento SHALL vir do item do catálogo escolhido, nunca de texto livre. A data de publicação e o estabelecimento dono SHALL ser preenchidos pelo servidor, ignorando qualquer valor da requisição. A imagem SHALL seguir as regras de validação de imagem da plataforma (até 5 MB; JPEG, PNG ou WebP).

#### Scenario: Cadastro com todos os dados válidos

- **WHEN** um estabelecimento autenticado envia um arquivo de imagem válido, o item "Pão francês" do catálogo, quantidade 10, a unidade "un", o tipo "Total ou parcial", descrição e data de vencimento futura
- **THEN** o sistema cria o alimento vinculado ao estabelecimento autenticado e retorna seus dados, com nome "Pão francês", categoria "Pães e Massas", a unidade, o tipo de solicitação, a data de publicação e a imagem como URL da rota de leitura

#### Scenario: Observações opcionais

- **WHEN** um estabelecimento autenticado cadastra um alimento válido com observações e outro sem observações
- **THEN** o sistema cria os dois, devolvendo as observações no primeiro e `null` no segundo

#### Scenario: Campo obrigatório ausente ou em formato inválido

- **WHEN** um estabelecimento autenticado envia a submissão sem um campo obrigatório, ou com um campo em formato inválido (ex: quantidade negativa, tipo de solicitação fora dos três valores)
- **THEN** o sistema rejeita o cadastro e informa quais campos são inválidos, sem criar nenhum registro

#### Scenario: Item do catálogo ou unidade inexistente

- **WHEN** um estabelecimento autenticado envia um item do catálogo ou uma unidade de medida que não existe
- **THEN** o sistema rejeita o cadastro com `400` e `code` `INVALID_CATALOG_ITEM` ou `INVALID_MEASUREMENT_UNIT`, sem criar nenhum registro

#### Scenario: Nome e categoria livres são recusados

- **WHEN** um estabelecimento autenticado envia, além dos campos válidos, um nome ou uma categoria escritos à mão
- **THEN** o sistema rejeita o cadastro como campo não permitido, sem criar nenhum registro

#### Scenario: Imagem ausente

- **WHEN** um estabelecimento autenticado envia todos os campos sem o arquivo de imagem
- **THEN** o sistema rejeita o cadastro com `400` e `code` `IMAGE_REQUIRED`, sem criar nenhum registro

#### Scenario: Imagem inválida

- **WHEN** um estabelecimento autenticado envia uma imagem acima de 5 MB
- **THEN** o sistema rejeita o cadastro com `400` e `code` `IMAGE_TOO_LARGE`, sem criar o alimento e sem guardar o arquivo

#### Scenario: Falha depois do envio da imagem

- **WHEN** a imagem é válida, mas o cadastro falha depois de ela ter sido guardada (ex: item do catálogo inexistente)
- **THEN** o sistema não cria o alimento e apaga do armazenamento a imagem enviada

#### Scenario: Quantidade fracionada em unidade que não aceita fração

- **WHEN** um estabelecimento autenticado envia quantidade 2.5 com a unidade "un"
- **THEN** o sistema rejeita o cadastro com `400` e `code` `FRACTION_NOT_ALLOWED`, sem criar nenhum registro

#### Scenario: Quantidade fracionada em unidade que aceita fração

- **WHEN** um estabelecimento autenticado envia quantidade 2.5 com a unidade "kg"
- **THEN** o sistema cria o alimento com quantidade 2.50

#### Scenario: "Somente parcial" sem pedido parcial possível

- **WHEN** um estabelecimento autenticado envia o tipo "Somente parcial" com quantidade 1 e a unidade "un", que não aceita fração
- **THEN** o sistema rejeita o cadastro com `400` e `code` `PARTIAL_ONLY_QUANTITY_TOO_LOW`, porque nenhum pedido maior que 0 e menor que 1 é possível

#### Scenario: "Somente parcial" com pedido parcial possível

- **WHEN** um estabelecimento autenticado envia o tipo "Somente parcial" com quantidade 2 e a unidade "un", ou quantidade 0.5 e a unidade "kg"
- **THEN** o sistema cria o alimento

#### Scenario: Data de publicação e dono vêm do servidor

- **WHEN** um estabelecimento autenticado envia, junto dos campos válidos, uma data de publicação ou o identificador de outro estabelecimento
- **THEN** o sistema rejeita os campos não permitidos ou os ignora, e o alimento criado fica com a data do cadastro e vinculado só ao estabelecimento autenticado

#### Scenario: Requisição sem autenticação

- **WHEN** uma requisição de cadastro de alimento é enviada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não cria nenhum registro

#### Scenario: Conta autenticada não é um estabelecimento

- **WHEN** uma entidade beneficiária autenticada tenta cadastrar um alimento
- **THEN** o sistema rejeita a requisição, sem criar nenhum registro

### Requirement: Alimento cadastrado inicia com status "Ativo"

O sistema SHALL atribuir automaticamente o status "Ativo" a todo alimento no momento do cadastro, sem permitir que o cliente informe ou escolha o status inicial. Não existe etapa de revisão/aprovação antes do alimento ficar visível na plataforma.

#### Scenario: Status inicial automático

- **WHEN** um estabelecimento autenticado cadastra um alimento com todos os dados válidos
- **THEN** o sistema atribui o status "Ativo" ao alimento criado e ele fica imediatamente visível na plataforma, independentemente de qualquer valor de status presente na requisição

### Requirement: Formulário de cadastro de alimento

O modal "Cadastrar Alimento" SHALL usar as listas padronizadas, sem texto livre para alimento ou unidade: um select com busca sem acento no catálogo de alimentos, que mostra a categoria do item escolhido sem permitir editá-la; um select das unidades de medida; uma escolha do tipo de solicitação entre as três opções; o campo de observações, opcional; e, no topo do formulário, uma área de upload da foto do alimento que aceita clique ou arrastar e soltar e mostra a prévia da imagem escolhida. O formulário SHALL validar antes de enviar a quantidade fracionada pela unidade escolhida e a regra do "Somente parcial", e SHALL mostrar no campo certo os erros devolvidos pelo servidor.

#### Scenario: Busca sem acento no select do catálogo

- **WHEN** o estabelecimento digita "pao" no select de alimento
- **THEN** o select mostra "Pão francês", "Pão de forma" e os demais itens que contêm o trecho

#### Scenario: Categoria preenchida pelo alimento

- **WHEN** o estabelecimento escolhe "Queijo muçarela" no select de alimento
- **THEN** o formulário mostra a categoria "Laticínios", sem permitir alterá-la

#### Scenario: Fração em unidade que não aceita

- **WHEN** o estabelecimento informa quantidade 2.5 com a unidade "Unidade"
- **THEN** o formulário mostra o erro no campo de quantidade e não envia o cadastro

#### Scenario: Foto arrastada para a área de upload

- **WHEN** o estabelecimento arrasta uma imagem PNG válida para a área de upload
- **THEN** a prévia da imagem aparece dentro da área, e arrastar um arquivo PDF mostra o erro de formato no campo da foto

#### Scenario: Alimento aparece no feed depois do cadastro

- **WHEN** o estabelecimento conclui um cadastro válido
- **THEN** o modal fecha, e o alimento aparece no feed com o nome do catálogo, a categoria, a unidade e a imagem enviada
