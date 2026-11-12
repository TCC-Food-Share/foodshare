## MODIFIED Requirements

### Requirement: Etapa de foto no formulário de cadastro
O formulário de cadastro do frontend SHALL ter uma etapa "Foto de perfil", obrigatória, depois da etapa de endereço, usando o componente de seleção de imagem da plataforma. O formulário SHALL impedir a conclusão do cadastro enquanto nenhuma imagem válida estiver selecionada. Quando o servidor rejeitar a imagem, o formulário SHALL voltar para a etapa "Foto de perfil" e mostrar a mensagem correspondente à `code`.

#### Scenario: Concluir sem foto
- **WHEN** o usuário chega à etapa "Foto de perfil" e tenta concluir o cadastro sem escolher imagem
- **THEN** o formulário não envia o cadastro e informa que a foto é obrigatória

#### Scenario: Concluir com foto
- **WHEN** o usuário escolhe uma imagem válida na etapa "Foto de perfil" e conclui o cadastro
- **THEN** o formulário envia os dados e a imagem numa única submissão e, com o cadastro criado, leva o usuário para a tela "Confirme seu e-mail", com o e-mail pessoal informado

#### Scenario: Servidor rejeita a imagem
- **WHEN** o usuário conclui o cadastro e o servidor responde `400` com `code` `IMAGE_INVALID_TYPE`
- **THEN** o formulário volta para a etapa "Foto de perfil" e mostra a mensagem de formato não aceito

#### Scenario: Dado duplicado depois da foto
- **WHEN** o usuário conclui o cadastro com imagem válida e o servidor responde que o CNPJ já está em uso
- **THEN** o formulário volta para a etapa do CNPJ, como antes, e mantém a imagem escolhida para o próximo envio

## ADDED Requirements

### Requirement: Conta criada sem e-mail confirmado
O sistema SHALL criar a conta do cadastro com o e-mail pessoal não confirmado e SHALL enviar a ele o código de confirmação (RF75, RN47). A resposta do cadastro não muda. Até a confirmação, a conta não faz login, e, se não for confirmada em 24 horas, é apagada de vez (RN48).

#### Scenario: Cadastro concluído
- **WHEN** o cadastro é concluído com dados e imagem válidos
- **THEN** a conta é criada com o e-mail pessoal não confirmado e um código de confirmação é enviado a esse e-mail

#### Scenario: Cadastro desfeito por erro
- **WHEN** a criação da instituição falha depois da criação do usuário e o cadastro é desfeito
- **THEN** nenhuma conta fica gravada, mesmo que o código já tenha sido enviado, e o código enviado não confirma nada
