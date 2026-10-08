# Escopo e requisitos — Food Share (versão final)

Fonte da verdade dos requisitos do Food Share **a partir do fim do MVP**.

- **RF01–RF58 e RNF01–RNF16** vêm do documento final do TCC, com a mesma
  numeração. Os marcados como **texto revisado** foram reescritos por
  decisões tomadas depois do documento. Vale o texto daqui; o documento
  do TCC está sendo atualizado para bater com ele.
- **RF59–RF73 e RNF17** são novos: padronização de cadastros, sugestões,
  expiração de pedidos e lembretes por WhatsApp.
- As **regras de negócio (RN)** e as **decisões (DT)** detalham o que os RF
  deixam implícito. Em caso de dúvida na implementação, elas mandam.

> **Numeração nova.** O MVP usava outra numeração (RF01–RF20). Changes
> arquivadas em `openspec/changes/archive/`, branches antigas e
> `docs/mvp/` citam os códigos antigos. Para traduzir, use a coluna
> "Código no MVP". Em código novo, branch, commit ou spec, use **só** a
> numeração deste arquivo.

## Escopo

| Dentro do escopo | Fora do escopo |
| ---------------- | -------------- |
| Cadastro, autenticação, recuperação de senha por código e exclusão lógica da própria conta | Suporte multilíngue (RNF16), adiado no documento do TCC |
| Perfis públicos (dados mínimos), listagem de instituições e WhatsApp dentro de pedido em andamento | Avaliação mútua entre instituições, adiada no documento do TCC |
| Alimentos: cadastro padronizado e publicado na hora, tipo de solicitação, edição, desativação, reativação, exclusão lógica e "Meus Alimentos" | Pagamento ou qualquer transação financeira |
| Pedidos: total ou parcial, aceite, rejeição, cancelamento com motivo, confirmação de recebimento, expiração automática, listagem com busca | Coleta ou transporte pela plataforma (a retirada é combinada entre as instituições) |
| Listas padronizadas (categorias, catálogo de alimentos, unidades, motivos, termos proibidos) e sugestões de novas opções | E-mail de notificação (só a recuperação de senha usa e-mail) |
| Painel administrativo completo | Aplicativo nativo para celular |
| Upload de imagens para o MinIO, e-mail pelo Resend, lembretes por WhatsApp via n8n, logs e auditoria | Tela de consulta da auditoria (opcional, só se sobrar tempo) |

## Atores

| Ator | Papel no sistema |
| ---- | ---------------- |
| Estabelecimento | Doador. Cadastra alimentos e responde aos pedidos. |
| Entidade Beneficiária | Receptora. Solicita doações e confirma o recebimento. |
| Administrador | Modera a plataforma e mantém as listas padronizadas. Nunca altera o status de um pedido (RN13). |
| Sistema | Tarefas agendadas: expiração de pedidos (RF72) e lembretes (RF73, RF74). |

## Legenda da coluna "Situação"

- ✅ **Pronto** — o MVP já atende. No máximo conferir um detalhe.
- 🟡 **Ajustar** — o MVP atende parte. A coluna "O que muda" diz o que falta.
- 🆕 **Novo** — não existe no MVP.
- ⛔ **Fora do escopo**.

## Requisitos funcionais (RF)

| Código | Descrição | Ator | Situação | Código no MVP | O que muda |
| ------ | --------- | ---- | -------- | ------------- | ---------- |
| RF01 | O Estabelecimento deve poder se cadastrar no sistema informando os seguintes atributos obrigatórios dados pessoais do responsável: nome, email pessoal, celular pessoal, senha e imagem; dados institucionais: razão social, CNPJ, email institucional, celular institucional e descrição; dados de endereço: CEP, logradouro, número, complemento, cidade e estado. O campo nome fantasia é opcional. Não deve ser permitido cadastrar dois ou mais Estabelecimentos com o mesmo CNPJ, email pessoal, celular pessoal, email institucional ou celular institucional. O Estabelecimento inicia com o atributo deletado definido como falso. | Estabelecimento | 🟡 | RF01, RF02 | imagem obrigatória (upload no MinIO); unicidade também de e-mail/celular institucional |
| RF02 | A Entidade Beneficiária deve poder se cadastrar no sistema informando os seguintes atributos obrigatórios dados pessoais do responsável: nome, email pessoal, celular pessoal, senha e imagem; dados institucionais: razão social, CNPJ, email institucional, celular institucional e descrição; dados de endereço: CEP, logradouro, número, complemento, cidade e estado. O campo nome fantasia é opcional. Não deve ser permitido cadastrar duas ou mais Entidades Beneficiárias com o mesmo CNPJ, email pessoal, celular pessoal, email institucional ou celular institucional. A Entidade Beneficiária inicia com o atributo deletado definido como falso. | Entidade Beneficiária | 🟡 | RF03, RF04 | idem RF01 |
| RF03 | O Estabelecimento e a Entidade Beneficiária devem poder editar seus próprios dados cadastrais. Os campos editáveis são: nome fantasia, email institucional, celular institucional, celular pessoal, nome do responsável, imagem, descrição e endereço. Os campos email pessoal, CNPJ e razão social devem ser exibidos, mas não editáveis. | Estabelecimento, Entidade Beneficiária | 🟡 | RF05, RF06 | passam a ser editáveis também: nome fantasia, celular pessoal, nome do responsável |
| RF04 | O Estabelecimento deve poder realizar a exclusão lógica de sua própria conta, definindo o atributo deletado como verdadeiro tanto no Estabelecimento quanto em todos os seus alimentos vinculados. Caso existam pedidos com status "Pendente" ou "Em andamento", o Estabelecimento deve receber um alerta informando que, ao prosseguir, os pedidos com status "Em andamento" serão automaticamente cancelados com o motivo de sistema "Conta encerrada pela instituição" e os pedidos com status "Pendente" serão automaticamente rejeitados. | Estabelecimento | 🆕 | — | **texto revisado** |
| RF05 | A Entidade Beneficiária deve poder realizar a exclusão lógica de sua própria conta, definindo o atributo deletado como verdadeiro tanto na Entidade Beneficiária quanto em todos os seus pedidos vinculados, exceto aqueles com status "Doado" ou "Cancelado" associados a Estabelecimentos não excluídos logicamente, que devem permanecer visíveis para fins históricos. Caso existam pedidos com status "Pendente" ou "Em andamento", a Entidade Beneficiária deve receber um alerta informando que, ao prosseguir, esses pedidos serão automaticamente cancelados com o motivo de sistema "Conta encerrada pela instituição", e as quantidades reservadas voltarão a ficar disponíveis nos alimentos. | Entidade Beneficiária | 🆕 | — | **texto revisado** |
| RF06 | O Estabelecimento, a Entidade Beneficiária e o Administrador devem poder acessar o sistema informando o email pessoal e senha previamente cadastrados. O acesso deve ser concedido apenas se as credenciais forem válidas e a conta não estiver excluída logicamente. | Estabelecimento, Entidade Beneficiária, Administrador | ✅ | RF07, RF08 |  |
| RF07 | O Estabelecimento, a Entidade Beneficiária e o Administrador devem poder encerrar sua sessão, sendo redirecionados para a tela de login. | Estabelecimento, Entidade Beneficiária, Administrador | ✅ | RF09 | conferir redirecionamento para /login |
| RF08 | O Estabelecimento, a Entidade Beneficiária e o Administrador devem poder recuperar sua senha informando o email pessoal previamente cadastrado. Após validação do email, um código de verificação deve ser enviado ao endereço informado. O usuário deve inserir o código recebido para confirmar a solicitação e, após verificação bem-sucedida, deve poder definir uma nova senha. | Estabelecimento, Entidade Beneficiária, Administrador | 🆕 | — | plugin emailOTP do better-auth + Resend (DT03, DT04) |
| RF09 | O Estabelecimento e a Entidade Beneficiária devem poder iniciar uma conversa no WhatsApp com a outra instituição de um pedido com status "Em andamento", ao clicar no celular institucional exibido no detalhe desse pedido, sendo redirecionados via link padrão da API do WhatsApp (https://wa.me/), com o número convertido para o formato internacional. | Estabelecimento, Entidade Beneficiária | 🆕 | — | **texto revisado**; só no detalhe de pedido "Em andamento" |
| RF10 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar uma lista de instituições do tipo oposto à instituição logada, com opção de busca por nome fantasia, razão social, CNPJ, descrição, cidade ou estado. Instituições com exclusão lógica ativada não devem ser exibidas. A listagem deve conter apenas dados públicos: nome fantasia (ou razão social quando não houver nome fantasia), imagem, cidade e estado. | Estabelecimento, Entidade Beneficiária | 🆕 | — | **texto revisado** |
| RF11 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar todos os seus dados cadastrais, exceto a senha. | Estabelecimento, Entidade Beneficiária | ✅ | (F3) | GET /establishments/me e /beneficiary-entities/me |
| RF12 | O Estabelecimento deve poder visualizar o perfil público das Entidades Beneficiárias, exibindo apenas nome fantasia (ou razão social), imagem, descrição, cidade e estado, sem dados de contato, endereço ou dados pessoais do responsável. Entidades com exclusão lógica ativada não devem aparecer na listagem nem ser acessíveis. Ao visualizar o perfil de uma Entidade Beneficiária, o Estabelecimento deve poder ver todos os pedidos associados entre ele e essa Entidade Beneficiária. | Estabelecimento | 🆕 | — | **texto revisado** |
| RF13 | A Entidade Beneficiária deve poder visualizar o perfil público dos Estabelecimentos, exibindo apenas nome fantasia (ou razão social), imagem, descrição, cidade e estado, sem dados de contato, endereço ou dados pessoais do responsável. Estabelecimentos com exclusão lógica ativada não devem aparecer na listagem nem ser acessíveis. Ao visualizar o perfil de um Estabelecimento, a Entidade Beneficiária deve poder ver todos os alimentos com status "Ativo" cadastrados por aquele Estabelecimento. | Entidade Beneficiária | 🆕 | — | **texto revisado** |
| RF14 | O Estabelecimento deve poder cadastrar um Alimento informando os atributos obrigatórios: imagem, alimento (selecionado do catálogo de alimentos, que define a categoria), quantidade, unidade de medida (selecionada da lista cadastrada), tipo de solicitação aceita ("Somente total", "Somente parcial" ou "Total ou parcial"), descrição e data de vencimento. O campo observações é opcional. O alimento deve iniciar com o status "Ativo", ficando disponível imediatamente na listagem, e com o atributo deletado definido como falso; a data de publicação é a data do cadastro. | Estabelecimento | 🟡 | RF10 | **texto revisado**; nasce "Ativo" (como no MVP); nome vem do catálogo (define a categoria); unidade da lista; tipo de solicitação; observações |
| RF15 | O Estabelecimento deve poder editar apenas os alimentos com status "Ativo", podendo alterar os atributos validade e quantidade. Alimentos vinculados a pedidos com status "Em andamento" não devem ser editáveis. Ao alterar a quantidade, os pedidos com status "Pendente" do tipo total passam a solicitar a nova quantidade disponível, com a indicação da alteração no detalhe do pedido; os pedidos do tipo parcial cuja quantidade solicitada seja maior que a nova quantidade disponível devem ser rejeitados automaticamente, e os demais permanecem inalterados. | Estabelecimento | 🆕 | — | **texto revisado** |
| RF16 | O Estabelecimento deve poder realizar a exclusão lógica de seus alimentos. Ao solicitar a exclusão de alimentos vinculados a pedidos com status "Pendente" ou "Em andamento", o Estabelecimento deve receber um alerta de confirmação informando que os pedidos com status "Pendente" serão rejeitados e os pedidos com status "Em andamento" serão cancelados, sendo necessário registrar um motivo de cancelamento. Alimentos excluídos não podem ser editados ou reativados, mas devem permanecer visíveis nos registros de pedidos com status "Doado", "Rejeitado" ou "Cancelado". | Estabelecimento | 🆕 | — | **texto revisado** |
| RF17 | O Estabelecimento deve poder reativar alimentos com status "Inativo", atualizando obrigatoriamente a data de validade e a quantidade. O alimento reativado deve assumir o status "Ativo". | Estabelecimento | 🆕 | — |  |
| RF18 | O Estabelecimento deve poder desativar alimentos com status "Ativo", alterando seu status para "Inativo". Alimentos vinculados a pedidos com status "Em andamento" não devem ser desativados. Os pedidos com status "Pendente" vinculados devem ser rejeitados. | Estabelecimento | 🆕 | — | **texto revisado** |
| RF19 | O Estabelecimento deve poder visualizar seus alimentos cadastrados, separados por status (Ativo, Reservado, Inativo), com opção de busca por nome, categoria, quantidade, descrição, data de vencimento e data de publicação, além de ordenação por campo. | Estabelecimento | 🆕 | — | **texto revisado**; tela "Meus Alimentos" |
| RF20 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar todos os alimentos com status "Ativo", com quantidade disponível maior que zero e dentro da validade, de instituições não excluídas, com opção de busca por nome, categoria, cidade e estado. Apenas usuários autenticados podem acessar essa lista. Alimentos com exclusão lógica ativada não devem ser exibidos. A listagem deve exibir apenas dados públicos: nome, imagem, categoria, quantidade disponível, unidade de medida, data de vencimento e nome do Estabelecimento. | Estabelecimento, Entidade Beneficiária | 🟡 | RF11, RF12 | **texto revisado**; listar só "Ativo" de instituições não excluídas; exibir unidade e estabelecimento |
| RF21 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar os dados completos de um alimento selecionado, incluindo: nome, imagem, categoria, quantidade disponível, unidade de medida, tipo de solicitação aceita, descrição, observações, status, data de vencimento, data de publicação e dados do Estabelecimento: nome, cidade e estado. | Estabelecimento, Entidade Beneficiária | 🟡 | RF13 | **texto revisado**; exibir tipo de solicitação, observações e data de publicação |
| RF22 | A Entidade Beneficiária deve poder solicitar um pedido de doação para um alimento disponível, informando a quantidade conforme o tipo de solicitação aceita pelo alimento: a quantidade total disponível ("Somente total"), uma quantidade parcial maior que zero e menor que a quantidade disponível ("Somente parcial") ou qualquer uma das duas ("Total ou parcial"). O pedido deve registrar se é do tipo total ou parcial e iniciar com o status "Pendente". A Entidade Beneficiária não deve poder criar um novo pedido caso já possua 10 ou mais pedidos com status "Pendente" ou "Em andamento", devendo aguardar uma resposta ou cancelar um pedido anterior para prosseguir, nem caso já possua um pedido com status "Pendente" ou "Em andamento" para o mesmo alimento. | Entidade Beneficiária | 🟡 | RF14, RF15 | **texto revisado**; respeitar o tipo de solicitação do alimento; limite e duplicidade já existem |
| RF23 | O Estabelecimento deve poder aceitar pedidos recebidos com status "Pendente", alterando o status para "Em andamento" e reservando a quantidade solicitada, que é descontada da quantidade disponível do alimento. Caso a quantidade disponível chegue a zero, o alimento deve assumir o status "Reservado", impedindo novas solicitações. Após o aceite, os pedidos com status "Pendente" do mesmo alimento cuja quantidade seja maior que a nova quantidade disponível devem ser rejeitados automaticamente. | Estabelecimento | 🟡 | RF16 | **texto revisado**; status "Reservado" ao zerar; rejeição automática dos pendentes que não cabem mais |
| RF24 | O Estabelecimento deve poder rejeitar pedidos recebidos com status "Pendente", alterando o status do pedido para "Rejeitado". | Estabelecimento | ✅ | RF17 | **texto revisado** |
| RF25 | A Entidade Beneficiária deve poder confirmar o recebimento do alimento, alterando o status do pedido para "Doado". Apenas pedidos com status "Em andamento" podem ser confirmados. Após a confirmação, caso a quantidade disponível do alimento seja zero e não existam outros pedidos com status "Em andamento" vinculados a ele, o alimento deve assumir o status "Inativo" e os demais pedidos com status "Pendente" associados ao alimento devem ser rejeitados. | Entidade Beneficiária | 🟡 | RF18 | **texto revisado**; alimento "Inativo" ao zerar; rejeitar pendentes restantes |
| RF26 | O Estabelecimento e a Entidade Beneficiária devem poder cancelar pedidos com status "Pendente" ou "Em andamento", alterando o status para "Cancelado", sendo obrigatório selecionar um motivo de cancelamento de uma lista cadastrada. Se o pedido estava "Em andamento", a quantidade reservada deve voltar à quantidade disponível do alimento e, caso o alimento esteja "Reservado", ele deve voltar ao status "Ativo". O motivo deve ficar vinculado ao pedido cancelado. | Estabelecimento, Entidade Beneficiária | 🆕 | — | **texto revisado**; cancelamento com motivo |
| RF27 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar seus pedidos vinculados, separados por status (Pendente, Em andamento, Rejeitado, Doado, Cancelado), com opção de busca por nome do alimento, data do pedido ou nome do Estabelecimento doador. | Estabelecimento, Entidade Beneficiária | 🟡 | RF19 | **texto revisado**; status novos + aba "Cancelado" + busca |
| RF28 | O Estabelecimento e a Entidade Beneficiária devem poder visualizar os detalhes completos de um pedido vinculado, incluindo: alimento solicitado, data do pedido, quantidade solicitada, status atual, nome da Entidade Beneficiária solicitante e nome do Estabelecimento. Enquanto o pedido estiver com status "Em andamento", o detalhe deve exibir também, para as duas instituições envolvidas, o email institucional, o celular institucional e o endereço completo da outra instituição. A visualização deve estar acessível apenas para as instituições autenticadas envolvidas no pedido, independentemente do status ou da exclusão lógica, permanecendo disponível para fins históricos. | Estabelecimento, Entidade Beneficiária | 🟡 | RF20 | **texto revisado**; contatos e endereço enquanto "Em andamento"; acessível após exclusão lógica |
| RF29 | O Administrador deve poder cadastrar um novo usuário informando os atributos obrigatórios: nome, email, senha e imagem. Não deve ser permitido cadastrar dois usuários com o mesmo email. | Administrador | 🆕 | — | painel administrativo |
| RF30 | O Administrador deve poder editar o perfil de qualquer usuário cadastrado, podendo alterar: imagem, nome e email. O campo email deve ser único entre os administradores. Deve ser permitida a alteração parcial dos dados, exigindo apenas os campos modificados. Após a edição, uma mensagem de sucesso deve ser exibida. | Administrador | 🆕 | — | painel administrativo |
| RF31 | O Administrador deve poder excluir permanentemente a conta de outro usuário, desde que haja pelo menos um Administrador ativo no sistema, garantindo que sempre haja um usuário disponível para gerenciar a plataforma. | Administrador | 🆕 | — | painel administrativo |
| RF32 | O Administrador deve poder visualizar todos os usuários cadastrados, com opção de busca por identificador, nome ou email, exibindo o identificador, a imagem, o nome e o email de cada usuário, além de ordenação por campo. | Administrador | 🆕 | — | painel administrativo |
| RF33 | O Administrador deve poder cadastrar uma Categoria de alimentos informando seu nome. Não deve ser permitido cadastrar duas ou mais categorias com o mesmo nome. | Administrador | 🆕 | — | painel administrativo |
| RF34 | O Administrador deve poder editar o nome de uma categoria de alimentos, desde que o novo nome não seja idêntico ao de uma categoria já existente. | Administrador | 🆕 | — | painel administrativo |
| RF35 | O Administrador deve poder excluir uma categoria de alimento, desde que não haja itens do catálogo de alimentos vinculados a ela. Caso a categoria esteja associada a itens do catálogo, a exclusão deve ser bloqueada, com exibição de mensagem informativa. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF36 | O Administrador deve poder visualizar todas as categorias cadastradas, com opção de busca por identificador e nome, exibindo o identificador e o nome de cada categoria, além de ordenação por campo. | Administrador | 🆕 | — | painel administrativo |
| RF37 | O Administrador deve poder cadastrar motivos de cancelamento padronizados informando o nome. Não deve ser permitido cadastrar dois ou mais motivos com o mesmo nome. Os motivos ficam disponíveis para seleção por Estabelecimentos e Entidades Beneficiárias ao cancelar pedidos. | Administrador | 🆕 | — | painel administrativo |
| RF38 | O Administrador deve poder editar o nome de um motivo de cancelamento, desde que o novo nome não seja igual ao de um motivo já cadastrado. Os motivos de sistema, usados nos cancelamentos automáticos, não podem ser editados. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF39 | O Administrador deve poder excluir um motivo de cancelamento, desde que ele não esteja vinculado a pedidos cancelados e não seja um motivo de sistema. Caso esteja associado a algum pedido, a exclusão deve ser bloqueada. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF40 | O Administrador deve poder visualizar a lista completa de motivos de cancelamento, com opção de busca por identificador e nome, exibindo o identificador e o nome de cada motivo, além de ordenação por campo. | Administrador | 🆕 | — | painel administrativo |
| RF41 | O Administrador deve poder cadastrar uma nova Instituição, escolhendo previamente o tipo (Estabelecimento ou Entidade Beneficiária) e informando os atributos obrigatórios — dados pessoais do responsável: nome, email pessoal, celular pessoal, senha e imagem; dados institucionais: razão social, CNPJ, email institucional, celular institucional e descrição; dados de endereço: CEP, logradouro, número, complemento, cidade e estado. O campo nome fantasia é opcional. Não deve ser permitido cadastrar uma Instituição com CNPJ, email pessoal, celular pessoal, email institucional ou celular institucional já em uso. A Instituição cadastrada inicia com o atributo deletado definido como falso. | Administrador | 🆕 | — | painel administrativo |
| RF42 | O Administrador deve poder realizar a exclusão lógica de um Estabelecimento. Caso existam pedidos com status "Em andamento", o Administrador deve receber um alerta informando que todos esses pedidos serão cancelados, sendo necessário registrar um motivo, e os pedidos com status "Pendente" serão rejeitados. Confirmada a ação, o atributo deletado deve ser definido como verdadeiro tanto no Estabelecimento quanto em todos os seus alimentos vinculados. Após a exclusão, a conta perde acesso ao sistema e deixa de aparecer em listagens e interações ativas. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF43 | O Administrador deve poder realizar a exclusão lógica de uma Entidade Beneficiária. Caso existam pedidos com status "Pendente" ou "Em andamento", o Administrador deve receber um alerta informando que todos esses pedidos serão cancelados, sendo necessário registrar um motivo. Confirmada a ação, o atributo deletado deve ser definido como verdadeiro tanto na Entidade Beneficiária quanto em seus pedidos vinculados. Os pedidos com status "Doado" ou "Cancelado" associados a Estabelecimentos não excluídos devem permanecer visíveis para fins históricos. Após a exclusão, a conta perde acesso ao sistema e deixa de aparecer em listagens e interações ativas. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF44 | O Administrador deve poder editar o perfil de qualquer Instituição (Estabelecimento ou Entidade Beneficiária), podendo alterar: nome fantasia, email institucional, celular institucional, celular pessoal, nome do responsável, imagem, descrição, endereço e o campo deletado. Os campos email pessoal, CNPJ e razão social não devem ser editáveis. Não deve ser permitida duplicidade nos campos email institucional, celular institucional, celular pessoal e CNPJ entre instituições ativas. Caso o campo deletado seja alterado para verdadeiro, a exclusão lógica deve ser aplicada automaticamente à instituição. | Administrador | 🆕 | — | painel administrativo |
| RF45 | O Administrador deve poder excluir permanentemente contas de Estabelecimentos, removendo definitivamente do sistema todos os dados relacionados à conta, incluindo alimentos e pedidos. | Administrador | 🆕 | — | painel administrativo |
| RF46 | O Administrador deve poder excluir permanentemente contas de Entidades Beneficiárias, removendo definitivamente do sistema todos os pedidos vinculados à conta. | Administrador | 🆕 | — | painel administrativo |
| RF47 | O Administrador deve poder visualizar todas as Entidades Beneficiárias e Estabelecimentos cadastrados, com opção de busca por razão social, nome fantasia, CNPJ, email institucional, celular institucional, nome do responsável, email pessoal, celular pessoal, descrição, CEP, logradouro, número, complemento, cidade, estado, data de cadastro e deletado. As senhas não devem ser exibidas. O Administrador deve poder ordenar os registros por campo. | Administrador | 🆕 | — | painel administrativo |
| RF48 | O Administrador deve poder visualizar o perfil completo de qualquer Instituição cadastrada (Entidade Beneficiária ou Estabelecimento), exibindo separadamente os dados institucionais — razão social, nome fantasia, CNPJ, email institucional, celular institucional, imagem, descrição e endereço completo — e os dados pessoais do responsável pelo cadastro — nome, email pessoal e celular pessoal — além de data de cadastro, sinalização de exclusão lógica, alimentos cadastrados, pedidos feitos ou recebidos e indicadores de atividade. A visualização deve ser somente leitura. | Administrador | 🆕 | — | painel administrativo |
| RF49 | O Administrador deve poder visualizar as sugestões recebidas, com filtro por tipo e status (Pendente, Aprovada, Recusada), e decidir sobre cada uma. Ao aprovar, a nova opção deve ser cadastrada na lista correspondente, podendo o Administrador ajustar o texto e, para item do catálogo, escolher a categoria. Ao recusar, a sugestão fica registrada como recusada. | Administrador | 🆕 | — | **texto revisado**; avaliar sugestões (substitui a revisão de alimentos) |
| RF50 | O Administrador deve poder editar qualquer Alimento cadastrado, podendo modificar: imagem, alimento do catálogo, quantidade, unidade de medida, tipo de solicitação aceita, descrição, observações, data de vencimento e data de publicação. Após a edição, uma mensagem de sucesso deve ser exibida. | Administrador | 🆕 | — | **texto revisado**; painel administrativo |
| RF51 | O Administrador deve poder excluir permanentemente alimentos do sistema, removendo todos os dados do alimento, inclusive os pedidos vinculados. | Administrador | 🆕 | — | painel administrativo |
| RF52 | O Administrador deve poder visualizar todos os alimentos cadastrados, independentemente de status, com opção de busca por nome, categoria, status, estabelecimento, data de vencimento ou data de publicação, exibindo dados completos, além de ordenação por campo. | Administrador | 🆕 | — | painel administrativo |
| RF53 | O Administrador deve poder visualizar os detalhes completos de qualquer Alimento cadastrado, independentemente do status ou do estado lógico do Estabelecimento vinculado, incluindo: imagem, nome, categoria, quantidade em unidade, descrição, data de vencimento, data de publicação, status, nome do Estabelecimento vinculado e campo deletado do Estabelecimento. Alimentos vinculados a Estabelecimentos excluídos ou com status desativado devem ser destacados visualmente. Essa funcionalidade deve ser restrita a administradores autenticados. | Administrador | 🆕 | — | painel administrativo |
| RF54 | O Administrador deve poder excluir permanentemente qualquer Pedido registrado no sistema, independentemente do status ou do estado lógico das instituições vinculadas. Antes da exclusão, o Administrador deve receber um alerta informando que a operação é irreversível e que o histórico do pedido será perdido. Essa funcionalidade deve ser restrita a administradores autenticados. | Administrador | 🆕 | — | painel administrativo |
| RF55 | O Administrador deve poder visualizar todos os pedidos registrados no sistema, com opção de busca por alimento, Entidade Beneficiária, Estabelecimento, status ou data, exibindo dados completos, além de ordenação por campo. | Administrador | 🆕 | — | painel administrativo |
| RF56 | O Administrador deve poder visualizar os detalhes completos de qualquer Pedido registrado, independentemente do status ou do estado lógico das instituições vinculadas, incluindo: alimento solicitado, data do pedido, quantidade, status atual, nome da Entidade Beneficiária solicitante e nome do Estabelecimento doador. A visualização deve ser somente leitura. | Administrador | 🆕 | — | painel administrativo |
| RF57 | O Administrador deve poder visualizar, para cada Estabelecimento ou Entidade Beneficiária cadastrado, os dados pessoais do responsável pelo cadastro nome, email pessoal e celular pessoal exibidos junto às informações institucionais na listagem e no perfil completo. | Administrador | 🆕 | — | painel administrativo |
| RF58 | O Administrador deve poder buscar Estabelecimentos e Entidades Beneficiárias pelo nome, email pessoal ou celular pessoal do responsável pelo cadastro, retornando as instituições cujo responsável corresponda ao termo pesquisado. | Administrador | 🆕 | — | painel administrativo |
| RF59 | O Administrador deve poder cadastrar uma unidade de medida informando nome e sigla, e se ela aceita quantidades fracionadas. Não deve ser permitido cadastrar duas ou mais unidades com o mesmo nome ou a mesma sigla. | Administrador | 🆕 | — | padronização |
| RF60 | O Administrador deve poder editar o nome, a sigla e a indicação de fração de uma unidade de medida, desde que o novo nome e a nova sigla não sejam iguais aos de outra unidade já cadastrada. | Administrador | 🆕 | — | padronização |
| RF61 | O Administrador deve poder excluir uma unidade de medida, desde que não haja alimentos vinculados a ela. Caso esteja associada a algum alimento, a exclusão deve ser bloqueada, com exibição de mensagem informativa. | Administrador | 🆕 | — | padronização |
| RF62 | O Administrador deve poder visualizar todas as unidades de medida cadastradas, com opção de busca por identificador, nome e sigla, além de ordenação por campo. | Administrador | 🆕 | — | padronização |
| RF63 | O Administrador deve poder cadastrar um item no catálogo de alimentos informando o nome e a categoria. Não deve ser permitido cadastrar dois ou mais itens com o mesmo nome. | Administrador | 🆕 | — | padronização |
| RF64 | O Administrador deve poder editar o nome e a categoria de um item do catálogo de alimentos, desde que o novo nome não seja igual ao de outro item já cadastrado. | Administrador | 🆕 | — | padronização |
| RF65 | O Administrador deve poder excluir um item do catálogo de alimentos, desde que não haja alimentos vinculados a ele. Caso esteja associado a algum alimento, a exclusão deve ser bloqueada, com exibição de mensagem informativa. | Administrador | 🆕 | — | padronização |
| RF66 | O Administrador deve poder visualizar todos os itens do catálogo de alimentos, com opção de busca por identificador, nome e categoria, além de ordenação por campo. | Administrador | 🆕 | — | padronização |
| RF67 | O Administrador deve poder cadastrar um termo proibido, usado na validação de textos livres (RNF07). Não deve ser permitido cadastrar dois ou mais termos iguais. | Administrador | 🆕 | — | termos proibidos (RNF07) |
| RF68 | O Administrador deve poder editar um termo proibido, desde que o novo termo não seja igual a outro já cadastrado. | Administrador | 🆕 | — | termos proibidos (RNF07) |
| RF69 | O Administrador deve poder excluir um termo proibido. | Administrador | 🆕 | — | termos proibidos (RNF07) |
| RF70 | O Administrador deve poder visualizar todos os termos proibidos cadastrados, com opção de busca e ordenação por campo. | Administrador | 🆕 | — | termos proibidos (RNF07) |
| RF71 | O Estabelecimento e a Entidade Beneficiária devem poder sugerir uma nova opção para as listas padronizadas (categoria, item do catálogo de alimentos, unidade de medida ou motivo de cancelamento), informando o tipo e o texto da sugestão. A sugestão não bloqueia o cadastro em andamento: o usuário segue escolhendo a opção existente que melhor se adequa. | Estabelecimento, Entidade Beneficiária | 🆕 | — | sugestões |
| RF72 | O sistema deve cancelar automaticamente, uma vez por dia, os pedidos com status "Pendente" sem resposta há 7 dias ou mais, com o motivo de sistema "Pedido expirado sem resposta", e os pedidos com status "Pendente" de alimentos vencidos, com o motivo de sistema "Alimento vencido". | Sistema | 🆕 | — | tarefa agendada |
| RF73 | O sistema deve enviar um lembrete por WhatsApp à Entidade Beneficiária no 3º e no 7º dia de um pedido com status "Em andamento" ainda não confirmado, solicitando a confirmação de recebimento, com link para o pedido. | Sistema | 🆕 | — | lembrete via n8n (RNF17) |
| RF74 | O sistema deve enviar um lembrete por WhatsApp ao Estabelecimento no 5º dia de um pedido com status "Pendente" ainda sem resposta, informando que o pedido expirará em 2 dias, com link para o pedido. | Sistema | 🆕 | — | lembrete via n8n (RNF17) |

> **"Usuário" em RF29–RF32 = Administrador.** Esses requisitos correspondem
> à tela "Administradores" do protótipo. Instituições são geridas por
> RF41–RF48.

## Requisitos não funcionais (RNF)

| Código | Descrição | Dependência | Situação | Código no MVP | O que muda |
| ------ | --------- | ----------- | -------- | ------------- | ---------- |
| RNF01 | O sistema deve ser responsivo, adaptando-se a diferentes tamanhos de tela em dispositivos móveis e desktop. | - | ✅ | RNF01 |  |
| RNF02 | O sistema deve ser acessível pelos principais navegadores modernos (Chrome, Firefox, Safari e Edge), funcionando corretamente em computadores, tablets e dispositivos móveis. | RNF01 | ✅ | RNF02 |  |
| RNF03 | O sistema deve oferecer uma interface intuitiva e fácil de usar, com uma estética clean e minimalista. | - | ✅ | RNF03 |  |
| RNF04 | O sistema deve ter tempo de resposta inferior a 2 segundos para cada ação do usuário. | - | ✅ | RNF04 |  |
| RNF05 | O sistema deve suportar múltiplos usuários simultaneamente sem perda significativa de desempenho. | - | ✅ | RNF05 |  |
| RNF06 | O sistema deve realizar a validação automática dos campos de formulário no momento do preenchimento, identificando automaticamente dados como data de publicação e instituição responsável pelo registro, impedindo o envio de dados em formato incorreto ou incompleto. | RF01, RF02, RF14 | 🟡 | RNF06 | data de publicação e instituição responsável preenchidas pelo servidor; selects com busca nas listas padronizadas |
| RNF07 | O sistema deve realizar a validação automática de textos inseridos em campos de entrada livre, identificando e bloqueando palavras ofensivas, linguagem discriminatória, conteúdo inapropriado, links, URLs e referências externas não autorizadas. A lista de termos proibidos deve ser configurável pela equipe administrativa (RF67–RF70). | RF01, RF02 | 🟡 | RNF07 | **texto revisado**; lista vem da tabela de termos proibidos |
| RNF08 | O sistema deve criptografar senhas e dados sensíveis dos usuários utilizando padrões de segurança robustos. | RF01, RF02 | ✅ | RNF08 |  |
| RNF09 | O sistema deve limitar o tamanho de imagens de perfil e fotos enviadas a no máximo 5MB e armazená-las em um servidor seguro. | RF01, RF02 | 🟡 | RNF09 | upload real para o MinIO (hoje não há endpoint de upload) |
| RNF10 | O sistema deve garantir proteção contra ataques de injeção SQL, XSS e outras vulnerabilidades de segurança. | RF01, RF02 | ✅ | RNF10 |  |
| RNF11 | O sistema deve limitar as solicitações de código de recuperação de senha a no máximo uma a cada 10 minutos por origem de acesso, usando o limite de requisições nativo da biblioteca de autenticação, e invalidar o código após o uso bem-sucedido ou a expiração. | RF08 | 🆕 | — | **texto revisado**; limite nativo do better-auth (RN33, DT17) |
| RNF12 | O sistema deve integrar uma API de envio de email (Resend) para enviar mensagens importantes para os usuários, com remetente no domínio foodshare.com.br. | RF08 | 🆕 | — | **texto revisado**; Resend (DT04) |
| RNF13 | O sistema deve registrar logs de acesso e ações do administrador para facilitar a manutenção e o suporte técnico. | RF06 | 🟡 | RNF11 | acrescentar ações do administrador |
| RNF14 | O sistema deve registrar em uma tabela de auditoria todas as operações administrativas relevantes, incluindo edições e exclusões de alimentos, pedidos e instituições e as decisões sobre sugestões, com identificação do administrador responsável e data e hora da ação. | RF31, RF45, RF50, RF51, RF55 | 🆕 | — | **texto revisado**; tabela de auditoria, sem tela (DT09) |
| RNF15 | O sistema deve registrar logs de erros para facilitar a manutenção e o suporte técnico. | - | ✅ | RNF12 |  |
| RNF16 | O sistema deve ter suporte multilíngue, com opções iniciais para português e inglês, adaptando-se à localização do usuário. | - | ⛔ | — | adiado — fora do escopo |
| RNF17 | O sistema deve enviar as mensagens de WhatsApp por meio de um fluxo de automação externo (n8n), acionado por webhook, de forma que uma falha nesse serviço não interrompa nenhuma funcionalidade do sistema. | RF73, RF74 | 🆕 | — | desligado enquanto não houver número (P01) |

## Máquinas de estado

### Pedido

Status: `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado`.
Estados finais: `Rejeitado`, `Doado`, `Cancelado`.

**Terminologia:** "Em andamento" é **só** o status do pedido aceito. O
conjunto `Pendente` + `Em andamento` se chama **pedidos em aberto**. As
specs do MVP usavam "em andamento" para esse conjunto; a change 0.1 corrige.

| De | Para | Quem / gatilho | RF |
| -- | ---- | -------------- | -- |
| (novo) | Pendente | Entidade solicita | RF22 |
| Pendente | Em andamento | Estabelecimento aceita | RF23 |
| Pendente | Rejeitado | Estabelecimento rejeita | RF24 |
| Pendente | Rejeitado | Automático: outro aceite deixou o estoque menor que a quantidade pedida | RF23 |
| Pendente | Rejeitado | Automático: estabelecimento reduziu o estoque para menos que a quantidade de um pedido parcial | RF15 |
| Pendente | Rejeitado | Automático: alimento desativado, excluído ou esgotado após confirmação | RF16, RF18, RF25 |
| Pendente | Rejeitado | Automático: estabelecimento excluído logicamente | RF04, RF42 |
| Pendente | Cancelado | Entidade ou estabelecimento cancela, com motivo | RF26 |
| Pendente | Cancelado | Automático: 7 dias sem resposta, ou alimento vencido (motivo de sistema) | RF72 |
| Pendente | Cancelado | Automático: entidade excluída logicamente | RF05, RF43 |
| Em andamento | Doado | Entidade confirma recebimento | RF25 |
| Em andamento | Cancelado | Entidade ou estabelecimento cancela, com motivo | RF26 |
| Em andamento | Cancelado | Automático: exclusão lógica de alimento ou de conta | RF04, RF05, RF16, RF42, RF43 |

Mapeamento do MVP: `Pendente` → `Pendente` (sem mudança), `Aceito` →
`Em andamento`, `Rejeitado` → `Rejeitado`, `Recebido` → `Doado`.
`Cancelado` não existia.

### Alimento

Status: `Ativo`, `Reservado`, `Inativo`. A exclusão lógica não é
status: é o campo `deleted = true`.

| De | Para | Quem / gatilho | RF |
| -- | ---- | -------------- | -- |
| (novo) | Ativo | Estabelecimento cadastra (sem revisão manual) | RF14 |
| Ativo | Ativo | Aceite de pedido parcial (desconta do estoque, que continua > 0) | RF23 |
| Ativo | Reservado | Aceite que zera o estoque | RF23 |
| Reservado | Ativo | Pedido "Em andamento" cancelado (a quantidade volta ao estoque) | RF26 |
| Reservado | Inativo | Última confirmação de recebimento com estoque zerado | RF25 |
| Ativo | Inativo | Estabelecimento desativa | RF18 |
| Inativo | Ativo | Estabelecimento reativa, com nova validade e quantidade | RF17 |
| qualquer | `deleted = true` | Estabelecimento exclui, ou exclusão lógica do estabelecimento | RF16, RF04, RF42 |

Os alimentos que já existem no MVP viram `Ativo` na migração.

## Regras de negócio (RN)

Onde a regra vem do MVP, está marcado **(MVP)**.

### Pedidos

| Código | Regra | Origem |
| ------ | ----- | ------ |
| RN01 | O status de um pedido é sempre um destes: `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado`. Qualquer transição fora da máquina de estados é recusada com `409`. | RF22–RF26 |
| RN02 | Um pedido só pode ser criado para um alimento disponível: status `Ativo`, `deleted = false`, quantidade maior que 0, dentro da validade, de estabelecimento não excluído. | RF22, RN18, RN19 |
| RN03 | A quantidade pedida depende do tipo de solicitação do alimento. **Somente total**: igual à quantidade disponível. **Somente parcial**: maior que 0 e menor que a disponível. **Total ou parcial**: maior que 0 e até a disponível. Quantidade fracionada (até 2 casas) só se a unidade de medida aceitar fração. O pedido guarda se é do **tipo total** ou **parcial**; um pedido total sempre corresponde ao estoque inteiro (RN20). | RF22, RF59 |
| RN04 | A entidade com 10 ou mais pedidos **em aberto** (`Pendente` + `Em andamento`) não cria novo pedido (`409`, `code: ORDERS_IN_PROGRESS_LIMIT_REACHED`). | RF22 (MVP) |
| RN05 | A entidade não cria um segundo pedido do **mesmo alimento** enquanto tiver um pedido em aberto (`Pendente` ou `Em andamento`) dele (`409`, `code: DUPLICATE_ORDER_IN_PROGRESS`). Depois de `Rejeitado`, `Doado` ou `Cancelado`, pode pedir de novo. | RF22 (MVP) |
| RN06 | Se RN04 e RN05 valem ao mesmo tempo, a resposta é a de RN04. | (MVP) |
| RN07 | Aceite, numa única transação: confere que a quantidade pedida cabe no estoque (senão `409`); desconta do estoque; se o estoque zerar, o alimento vira `Reservado`; os demais pedidos `Pendente` do alimento com quantidade maior que o novo estoque viram `Rejeitado`. | RF23 |
| RN08 | Confirmação de recebimento, numa única transação: o pedido vira `Doado`. Se o estoque é 0 e não há outro pedido `Em andamento` do alimento, ele vira `Inativo` e os `Pendente` restantes viram `Rejeitado`. | RF25 |
| RN09 | Cancelar exige um motivo da lista, que fica gravado no pedido. Motivos de sistema (RN31) não aparecem para o usuário. Se o pedido estava `Em andamento`, a quantidade volta ao estoque e, se o alimento estava `Reservado`, ele volta a `Ativo`. | RF26 |
| RN10 | A rejeição não tem motivo. | RF24 |
| RN11 | Uma tarefa diária cancela os pedidos `Pendente` com 7 dias ou mais sem resposta (motivo "Pedido expirado sem resposta") e os `Pendente` de alimentos vencidos (motivo "Alimento vencido"). A tarefa é idempotente: rodar duas vezes no mesmo dia não muda nada. | RF72 |
| RN12 | As duas instituições envolvidas veem o detalhe do pedido em qualquer status, mesmo depois da exclusão lógica de qualquer uma delas. E-mail institucional, celular institucional (com link do WhatsApp) e endereço completo da outra parte aparecem **só enquanto o pedido está `Em andamento`**. | RF09, RF28 |
| RN13 | O administrador nunca altera o status de um pedido. Ele só lista, visualiza e exclui permanentemente. | RF54–RF56 |
| RN14 | Pedido com `deleted = true` não pode ser aceito, rejeitado, cancelado nem confirmado. | RF05, RF43 |

### Alimentos

| Código | Regra | Origem |
| ------ | ----- | ------ |
| RN15 | Todo alimento novo nasce `Ativo` e aparece na listagem pública na hora. Não há revisão manual: a padronização das listas (RN37, RN38) cumpre esse papel. | RF14 |
| RN16 | O alimento não tem nome nem categoria livres: ele aponta para um item do catálogo, e o nome e a categoria vêm desse item. A unidade de medida vem da lista de unidades. | RF14 |
| RN17 | O tipo de solicitação (`Somente total`, `Somente parcial`, `Total ou parcial`) é escolhido no cadastro e não é editável pelo estabelecimento. | RF14, RF15 |
| RN18 | Alimento com quantidade 0 não está disponível: não aparece na listagem nem na busca, e pedido e aceite são recusados. | (MVP) |
| RN19 | Alimento com data de vencimento no passado não está disponível (mesmo tratamento de RN18). Não muda de status sozinho; os pedidos pendentes dele são cancelados por RN11. | (MVP) |
| RN20 | O estabelecimento só edita alimento `Ativo` sem pedido `Em andamento`, e só validade e quantidade. Ao alterar a quantidade: pedidos `Pendente` do **tipo total** passam a pedir o novo estoque (estoque 5 → 6: o pedido passa de 5 para 6); pedidos do **tipo parcial** com quantidade maior que o novo estoque viram `Rejeitado`, e os que ainda cabem continuam como estão (parcial de 3, estoque 5 → 4: segue; parcial de 5, estoque 5 → 4: rejeitado). O pedido total acompanha o estoque para mais ou para menos, e isso vale também para o pedido total feito em alimento "Total ou parcial". Quando a quantidade de um pedido muda assim, o pedido registra a data da alteração, e o detalhe do pedido mostra "Quantidade atualizada pelo estabelecimento em dd/mm/aaaa". | RF15 |
| RN21 | Desativar só vale para alimento `Ativo` sem pedido `Em andamento`. Os pedidos `Pendente` viram `Rejeitado`. | RF18 |
| RN22 | Reativar só vale para alimento `Inativo` e exige nova validade e nova quantidade. | RF17 |
| RN23 | Na exclusão lógica de um alimento, os pedidos `Pendente` viram `Rejeitado` e os `Em andamento` viram `Cancelado`, com motivo escolhido pelo estabelecimento. | RF16 |
| RN24 | Alimento excluído logicamente não pode ser editado nem reativado, mas continua visível dentro dos pedidos `Doado`, `Rejeitado` e `Cancelado`. | RF16 |
| RN25 | A data de publicação e o estabelecimento dono do alimento são preenchidos pelo servidor, nunca pelo corpo da requisição. | RNF06 |

### Contas e instituições

| Código | Regra | Origem |
| ------ | ----- | ------ |
| RN26 | CNPJ, e-mail pessoal, celular pessoal, e-mail institucional e celular institucional são únicos entre **todas** as instituições (estabelecimentos e entidades juntos). A mensagem de erro é genérica e não diz qual campo colidiu. | RF01, RF02, RF41, RF44 |
| RN27 | E-mail pessoal, CNPJ e razão social nunca são editáveis, nem pelo administrador. | RF03, RF44 |
| RN28 | Exclusão lógica de estabelecimento (própria ou pelo administrador): `deleted = true` no estabelecimento e em todos os seus alimentos; pedidos `Em andamento` → `Cancelado`; pedidos `Pendente` → `Rejeitado`; sessões revogadas. A tela avisa antes quantos pedidos serão afetados. | RF04, RF42 |
| RN29 | Exclusão lógica de entidade (própria ou pelo administrador): pedidos `Pendente` e `Em andamento` → `Cancelado` (as quantidades reservadas voltam ao estoque); `deleted = true` na entidade e nos seus pedidos, **exceto** os `Doado` e `Cancelado` ligados a estabelecimentos não excluídos; sessões revogadas. | RF05, RF43 |
| RN30 | Na autoexclusão (RF04, RF05), o motivo gravado é o de sistema "Conta encerrada pela instituição". Na exclusão pelo administrador (RF42, RF43), ele escolhe um motivo da lista. | RF04, RF05, RF42, RF43 |
| RN31 | Existem três **motivos de sistema**, criados no seed e marcados como tal: "Conta encerrada pela instituição", "Pedido expirado sem resposta" e "Alimento vencido". Não aparecem para seleção, e o administrador não pode editá-los nem excluí-los. | RF38, RF39, RF72 |
| RN32 | Conta com exclusão lógica não faz login, e a resposta é a mesma de credencial inválida. | RF06 |
| RN33 | Recuperação de senha: código de 6 dígitos enviado por e-mail, válido por 10 minutos e descartado após o uso. A rota de solicitação aceita no máximo 1 pedido a cada 10 minutos por IP, pelo limite nativo do better-auth. | RF08, RNF11 |
| RN34 | Sempre existe pelo menos um administrador. A exclusão do último é recusada. | RF31 |
| RN35 | Listagens e perfis públicos nunca mostram instituições, alimentos ou pedidos com `deleted = true`. | RF10, RF12, RF13, RF20 |
| RN36 | Dados públicos de uma instituição: nome fantasia (ou razão social), imagem, descrição, cidade e estado. Contatos e endereço só aparecem no detalhe de pedido `Em andamento` (RN12). Dados pessoais do responsável só aparecem para o administrador. | RF10, RF12, RF13, RF57 |

### Listas padronizadas e sugestões

| Código | Regra | Origem |
| ------ | ----- | ------ |
| RN37 | As listas padronizadas são: categorias, catálogo de alimentos, unidades de medida, motivos de cancelamento e termos proibidos. Em cada uma, o nome é único sem diferenciar maiúsculas nem acentos; a exclusão é bloqueada se a opção estiver em uso; e o registro guarda o administrador que o criou. | RF33–RF40, RF59–RF70 |
| RN38 | Nos formulários, campos ligados a uma lista padronizada são selects com busca ("pão" encontra "Pão francês"), nunca texto livre. Ao lado de cada um há a opção "Sugerir nova opção" (RF71). | RF14, RF71 |
| RN39 | Sugestão não bloqueia nada: o usuário segue com a opção existente mais próxima. Status: `Pendente`, `Aprovada`, `Recusada`. Aprovar cria a opção na lista correspondente. Não há e-mail de retorno; o usuário vê a nova opção no próximo cadastro. | RF49, RF71 |
| RN40 | Seeds iniciais: as categorias do MVP; unidades (un, kg, g, L, mL, cx, pct, dz); motivos de cancelamento comuns + os três motivos de sistema; uma lista inicial de termos proibidos; e o catálogo de alimentos curado a partir da Tabela TACO (DT12). | RF33, RF37, RF59, RF63, RF67 |
| RN41 | Imagens (perfil e alimento): no máximo 5 MB, formatos JPEG, PNG ou WebP, gravadas no MinIO. O banco guarda só a referência do arquivo. | RNF09 |

### Notificações e auditoria

| Código | Regra | Origem |
| ------ | ----- | ------ |
| RN42 | Lembretes por WhatsApp: entidade no 3º e no 7º dia de pedido `Em andamento`; estabelecimento no 5º dia de pedido `Pendente`. Cada lembrete sai no máximo uma vez por pedido. O destino é o celular institucional. | RF73, RF74 |
| RN43 | O backend só chama um webhook do n8n (`N8N_WEBHOOK_URL`); quem envia a mensagem é o fluxo no n8n. Falha no webhook gera log de erro e não afeta nada mais. Com a variável vazia, os lembretes ficam desligados. | RNF17 |
| RN44 | O cadastro exibe uma linha de aviso junto ao celular institucional: o número receberá lembretes de pedidos por WhatsApp. | RF01, RF02, RF73 |
| RN45 | O único e-mail enviado pelo sistema é o código de recuperação de senha. O plano gratuito do Resend tem limite baixo. | RNF12 |
| RN46 | Toda operação de escrita feita por administrador grava uma linha de auditoria: administrador, ação, tipo e id do registro afetado, e data/hora. | RNF13, RNF14 |

## Decisões tomadas

| Código | Decisão |
| ------ | ------- |
| DT01 | Status do pedido: `Pendente`, `Em andamento`, `Rejeitado`, `Doado`, `Cancelado`. "Pendente" substitui o "Ativo" do documento do TCC, porque "Ativo" não dizia que o pedido espera aceite e colidia com o status "Ativo" do alimento. |
| DT02 | Status do alimento: `Ativo`, `Reservado`, `Inativo`. O status `Revisar` e a aprovação manual do documento do TCC foram removidos: a padronização do cadastro substitui a revisão. O RF49 foi reaproveitado para a avaliação de sugestões. |
| DT03 | A tabela `CodigoVerificacao` do modelo do TCC **não será criada**. A recuperação de senha (RF08) usa o plugin `emailOTP` do better-auth (`/email-otp/request-password-reset` e `/email-otp/reset-password`), que guarda os códigos na tabela `verification` do próprio better-auth. As rotas nativas são usadas direto, sem wrapper (`docs/CONVENCOES.md`). |
| DT04 | Todo e-mail sai pelo **Resend**, com remetente no domínio `foodshare.com.br`, que já está verificado. A chave fica em `RESEND_API_KEY`, nunca no código. |
| DT05 | A tabela `MotivoCancelamento` entra no modelo, com o marcador de motivo de sistema (RN31). |
| DT06 | O alimento tem **tipo de solicitação** (protótipo "Cadastrar Alimento"), e o pedido pode ser parcial. Isso substitui o "quantidade total" do RF22 original e mantém o pedido parcial do MVP. O campo "Observações" do protótipo entra, opcional. |
| DT07 | O limite de 10 conta `Pendente` + `Em andamento`, como no MVP, para evitar que uma entidade ocupe a fila de todos os estabelecimentos. A entidade sai do bloqueio cancelando pedidos (RF26) ou pela expiração (RF72). |
| DT08 | Perfil público com dados mínimos. Contatos e endereço só entre as partes de um pedido `Em andamento`. |
| DT09 | Auditoria em tabela no banco, sem tela. Uma tela só de leitura no painel é opcional, para o fim do projeto. |
| DT10 | Termos proibidos em tabela, com CRUD no painel admin, no mesmo padrão das outras listas. |
| DT11 | Padronização sugerida pelo orientador: listas pré-cadastradas + sugestões de novas opções (RF49, RF59–RF71). |
| DT12 | O catálogo de alimentos é populado **uma vez**, por seed, a partir da Tabela TACO (4ª ed., Unicamp). Não há consulta a API externa em tempo de execução. A curadoria remove variações de preparo, deixa os nomes naturais e liga cada grupo da TACO a uma categoria, resultando em algo entre 150 e 250 itens. A lista vai para um arquivo de seed versionado e é revisada pela dupla antes do merge. |
| DT13 | Expiração de pedidos pendentes em 7 dias e lembretes por WhatsApp via n8n (RF49–RF73). Tarefas agendadas no próprio backend (`@nestjs/schedule`). |
| DT14 | Regras nascidas no MVP e oficializadas: RN04, RN05, RN06, RN18 e RN19. |
| DT16 | Não existe revisão manual de alimentos (ver DT02). |
| DT17 | O RNF11 usa o limite de requisições nativo do better-auth (por IP), sem código próprio em volta da rota. |
| DT18 | Tipos fixos novos (tipo de solicitação, tipo de pedido, tipo e status de sugestão, tipo de lembrete) são enums do Prisma. Os status de alimento e de pedido continuam em tabela, como no MVP. Ver `docs/MODELO-DE-DADOS.md`. |
| DT15 | RNF16 (multilíngue) e a avaliação mútua ficam fora do escopo, como o documento do TCC já definia. |
| DT19 | O RNF13 (logs de acesso) é atendido gravando **toda requisição** à API na tabela `access_log`: método, caminho, status, duração, IP, user agent e usuário autenticado (inclusive login e logout). Sem tela de consulta. A retenção ainda será definida (`docs/PENDENCIAS.md`). |

## Pendências

| Código | Pendência | Enquanto isso |
| ------ | --------- | ------------- |
| P01 | Número de WhatsApp dedicado ao Food Share (chip próprio), conectado ao n8n. | RF73/RF74 são implementados e testados com um webhook de teste, e ficam desligados em staging (`N8N_WEBHOOK_URL` vazio). |
| P02 | Dados do staging: os alimentos do MVP têm nome livre, que não existe mais (RN16). | Recomendação: limpar os dados de teste do staging na migração, em vez de tentar casar os nomes com o catálogo. Confirmar antes da change de migração. |
