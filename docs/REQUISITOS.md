# Escopo e requisitos — Food Share (MVP)

## Escopo

| Dentro do escopo                                                                                                                     | Fora do escopo                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro e autenticação — cadastro de estabelecimentos e entidades beneficiárias, login/logout, edição dos próprios dados cadastrais | Administração da plataforma — painel administrativo completo (gestão de usuários, categorias, motivos de cancelamento, exclusões permanentes, relatórios) |
| Alimentos — cadastro de alimentos pelo estabelecimento, listagem com busca básica, visualização de detalhes                          | Conta de usuário (autoatendimento) — exclusão lógica da própria conta, recuperação de senha por código                                                    |
| Pedidos e doações — solicitação de pedido, aceite/rejeição pelo estabelecimento, confirmação de recebimento, histórico básico        | Funcionalidades avançadas — reativação/desativação manual de alimentos, categorias gerenciáveis, filtros avançados, cancelamento com motivo padronizado   |
|                                                                                                                                      | Comunicação entre instituições — WhatsApp direto, perfil público com histórico entre estabelecimento e entidade                                           |
|                                                                                                                                      | Internacionalização e avaliações — suporte multilíngue, avaliação mútua entre instituições                                                                |
|                                                                                                                                      | Financeiro e logístico — qualquer pagamento/transação; coleta ou transporte pela plataforma (retirada é combinada entre as próprias instituições)         |

## Requisitos funcionais (RF)

| Código | Descrição                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01   | O sistema deverá permitir que o estabelecimento se cadastre informando dados pessoais, institucionais e de endereço.                                     |
| RF02   | O sistema deverá impedir o cadastro de estabelecimentos com CNPJ, e-mail ou celular já utilizados por outro cadastro.                                    |
| RF03   | O sistema deverá permitir que a entidade beneficiária se cadastre informando dados pessoais, institucionais e de endereço.                               |
| RF04   | O sistema deverá impedir o cadastro de entidades beneficiárias com CNPJ, e-mail ou celular já utilizados por outro cadastro.                             |
| RF05   | O sistema deverá permitir que estabelecimentos e entidades beneficiárias editem seus dados cadastrais editáveis (contato, imagem, descrição e endereço). |
| RF06   | O sistema deverá impedir a edição dos campos e-mail pessoal, CNPJ e razão social após o cadastro.                                                        |
| RF07   | O sistema deverá permitir que estabelecimentos, entidades beneficiárias e administradores façam login com e-mail e senha.                                |
| RF08   | O sistema deverá impedir o acesso de contas com credenciais inválidas ou excluídas logicamente.                                                          |
| RF09   | O sistema deverá permitir que o usuário autenticado encerre sua sessão a qualquer momento.                                                               |
| RF10   | O sistema deverá permitir que o estabelecimento cadastre um alimento informando imagem, nome, categoria, quantidade, descrição e data de vencimento.     |
| RF11   | O sistema deverá permitir que usuários autenticados visualizem a listagem de alimentos.                                                                  |
| RF12   | O sistema deverá permitir a busca de alimentos por nome, categoria e localização.                                                                        |
| RF13   | O sistema deverá permitir a visualização dos dados completos de um alimento selecionado.                                                                 |
| RF14   | O sistema deverá permitir que a entidade beneficiária solicite um pedido de doação para um alimento disponível.                                          |
| RF15   | O sistema deverá impedir que a entidade beneficiária crie um novo pedido caso já possua 10 ou mais pedidos em andamento.                                 |
| RF16   | O sistema deverá permitir que o estabelecimento aceite um pedido recebido, reservando a quantidade do alimento vinculado.                                |
| RF17   | O sistema deverá permitir que o estabelecimento rejeite um pedido recebido.                                                                              |
| RF18   | O sistema deverá permitir que a entidade beneficiária confirme o recebimento do alimento, encerrando o pedido.                                           |
| RF19   | O sistema deverá permitir que estabelecimentos e entidades beneficiárias visualizem seus pedidos separados por status.                                   |
| RF20   | O sistema deverá permitir a visualização dos detalhes completos de um pedido vinculado.                                                                  |

## Requisitos não funcionais (RNF)

| Código | Descrição                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01  | O sistema deverá ser responsivo, adaptando-se a diferentes tamanhos de tela.                                                             |
| RNF02  | O sistema deverá ser compatível com os principais navegadores modernos (Chrome, Firefox, Safari e Edge).                                 |
| RNF03  | O sistema deverá oferecer uma interface intuitiva, com estética clean e minimalista.                                                     |
| RNF04  | O sistema deverá responder a cada ação do usuário em até 2 segundos.                                                                     |
| RNF05  | O sistema deverá suportar múltiplos usuários simultâneos sem perda significativa de desempenho.                                          |
| RNF06  | O sistema deverá validar automaticamente os campos de formulário no preenchimento, impedindo o envio de dados incorretos ou incompletos. |
| RNF07  | O sistema deverá validar textos em campos de entrada livre, bloqueando linguagem ofensiva, discriminatória ou links não autorizados.     |
| RNF08  | O sistema deverá criptografar senhas e dados sensíveis dos usuários.                                                                     |
| RNF09  | O sistema deverá limitar o tamanho de imagens enviadas a no máximo 5MB.                                                                  |
| RNF10  | O sistema deverá garantir proteção contra ataques de injeção SQL, XSS e vulnerabilidades similares.                                      |
| RNF11  | O sistema deverá registrar logs de acesso e login para fins de manutenção e suporte técnico.                                             |
| RNF12  | O sistema deverá registrar logs de erros para fins de manutenção e suporte técnico.                                                      |
