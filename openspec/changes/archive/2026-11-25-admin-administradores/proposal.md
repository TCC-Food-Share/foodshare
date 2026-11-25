## Why

Hoje só existe o administrador criado pelo seed, e a seção "Administradores" do painel é um aviso de "em
construção". Sem cadastro pelo painel, a dupla não consegue dar acesso a outra pessoa, nem trocar nome, e-mail ou foto
de um administrador, nem remover quem saiu. O RF29–RF32 pedem essa gestão, com a RN34 garantindo que sempre sobra
pelo menos um administrador. É o item 5.1 do plano, que depende só da 0.2 (`papel-administrador`, já em `develop`) e
destrava a 5.2, a 5.4 e a 5.5.

## What Changes

Cobre **RF29, RF30, RF31, RF32 e RN34**, com as decisões novas **DT46, DT47 e DT48** (abaixo). Usa a RN41 (imagem),
a RN46 (auditoria), a RN47, a RN48 e a DT39 (confirmação do e-mail), que já valem.

### Backend

- Controller novo `@AdminController('administrators')`, com:
  - **Listar (RF32):** `GET /admin/administrators`, paginado (DT23), com busca por identificador exato, nome ou e-mail
    (sem diferenciar maiúsculas nem acentos) e ordenação por id, nome ou e-mail. Cada linha traz id, URL da imagem,
    nome, e-mail e se o e-mail já foi confirmado (DT48). Só usuários com papel `Administrator`.
  - **Cadastrar (RF29):** `POST /admin/administrators`, multipart com nome, e-mail, senha (8 a 72) e imagem
    obrigatória (`@ImageUpload()`, pasta `users`). Cria pelo `auth.api.signUpEmail`, que grava a conta como não
    confirmada e já envia o código (DT39). E-mail já usado por qualquer usuário responde `409` com
    `code: EMAIL_ALREADY_REGISTERED`.
  - **Editar (RF30):** `PATCH /admin/administrators/:id`, multipart parcial (só os campos alterados) com nome, e-mail
    e imagem. Trocar o e-mail não exige nova confirmação (DT47). A imagem nova é gravada antes e a anterior apagada
    depois do commit (padrão da 0.3). E-mail repetido responde `409` com `EMAIL_ALREADY_REGISTERED`.
  - **Excluir permanentemente (RF31):** `DELETE /admin/administrators/:id`. Apaga o usuário (sessões e contas em
    cascata) e os códigos pendentes; auditoria e listas criadas por ele ficam, sem o vínculo (`SetNull`). A imagem sai
    do MinIO depois do commit. Excluir a si mesmo responde `409` com `CANNOT_DELETE_SELF` (DT46). Se a exclusão
    deixaria o sistema sem administrador confirmado (duas exclusões cruzadas ao mesmo tempo), responde `409` com
    `LAST_ADMINISTRATOR` (RN34).
  - Id que não é de administrador responde `404`.
- Toda escrita grava auditoria (`administrator.create`, `administrator.update`, `administrator.delete`), nunca com a
  senha.

### Frontend

- A seção **Administradores** sai do "em construção" e passa a usar a tabela administrativa da 1.3: colunas ID,
  imagem, nome e e-mail, com o selo **"Aguardando confirmação"** ao lado do nome de quem ainda não confirmou (DT48).
- Botão **"Novo administrador"**: diálogo com nome, e-mail, senha, confirmação da senha e imagem. Ao concluir, um aviso
  diz que o novo administrador recebeu um código no e-mail, só entra depois de confirmar, e que o cadastro é apagado se
  não confirmar em 24 horas (RN48).
- Ação **Editar**: o mesmo diálogo, sem senha, enviando só o que mudou, com mensagem de sucesso (RF30). Editar a si
  mesmo atualiza o nome e o e-mail mostrados no menu do painel.
- Ação **Excluir**: diálogo com o aviso de ação irreversível. A ação não aparece na linha do próprio administrador
  (DT46). `LAST_ADMINISTRATOR` vira mensagem própria.

### Documentação

- `docs/REQUISITOS.md`: DT46, DT47 e DT48 novas, citadas na observação do RF30, do RF31 e do RF32.
- `docs/PLANO-IMPLEMENTACAO.md`: item 5.1 marcado ✅ ao fim.
- Sem mudança no `docs/MODELO-DE-DADOS.md`: o schema já tem tudo, inclusive os `onDelete: SetNull` que a exclusão
  permanente (RF31) precisa na auditoria, nos acessos, nas listas e nas sugestões.

**Decisões tomadas com a dupla antes da proposta:**

- **DT46:** o administrador não exclui a própria conta pelo painel (RF31 fala em "conta de outro usuário"). A ação
  some da própria linha, e a API recusa com `409` e `code: CANNOT_DELETE_SELF`. Como quem exclui continua existindo,
  a RN34 só barra o caso de duas exclusões cruzadas ao mesmo tempo, com `409` e `code: LAST_ADMINISTRATOR`.
- **DT47:** trocar o e-mail de um administrador pelo painel (RF30), inclusive o próprio, vale na hora, sem nova
  confirmação. O login passa a ser pelo novo e-mail, e as sessões continuam. Exigir nova confirmação faria a RN48
  apagar a conta na hora seguinte, porque ela foi criada há mais de 24 horas.
- **DT48:** a listagem de administradores (RF32) mostra, além das colunas do RF32, o selo "Aguardando confirmação"
  para quem ainda não confirmou o e-mail, porque essa conta não entra e será apagada em 24 horas (RN48).

### Fora desta change

- Trocar ou redefinir a senha de outro administrador: o RF30 não inclui senha; cada um usa a recuperação (RF08).
- Excluir a própria conta de administrador: não entra (DT46).
- Reenviar o código de confirmação pelo painel: o novo administrador pede pela tela de confirmação, como as
  instituições (RF75).
- Gestão de instituições (RF41–RF48, RF57, RF58): 5.2 e 5.3. Alimentos (RF50–RF53): 5.4. Pedidos (RF54–RF56): 5.5.
- Tela de leitura da auditoria: não tem RF (`docs/PENDENCIAS.md`).

## Capabilities

### New Capabilities

- `admin/administradores`: listagem, cadastro, edição e exclusão permanente de administradores pelo painel (RF29–RF32,
  RN34, DT46–DT48), com a auditoria de cada escrita e as telas da seção "Administradores".

### Modified Capabilities

- `admin/painel`: a seção "Administradores" deixa de ser "em construção" e passa a mostrar a gestão de
  administradores.
- `auth/confirmacao-email`: o requisito do código enviado no cadastro ganha o cenário do administrador cadastrado pelo
  painel, que também nasce não confirmado (DT39).

## Impact

- **Backend:** módulo novo `admin/administrators` (controller, service, DTOs), registrado no `AdminModule`; usa
  `auth.api.signUpEmail`, `ImageStorageService`, `AuditService` e os helpers de listagem da 1.3
  (`createAdminListQueryDto`, `sessionAdministrator`).
- **Frontend:** `features/admin/administrators/` (página, API, diálogos de cadastro/edição e de exclusão), rota
  `/admin/administradores` no lugar do placeholder, reaproveitando `AdminTable`, o componente de upload da 0.3 e o
  `refreshSession` do `AuthProvider` ao editar a si mesmo.
- **Banco:** sem migration.
- **Sem variável de ambiente nova.**
