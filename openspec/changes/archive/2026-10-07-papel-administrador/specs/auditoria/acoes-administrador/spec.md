## Purpose

Garantir que toda operação de escrita feita por um administrador deixe um registro permanente de quem fez, o quê, em qual registro e quando, mesmo que o administrador seja excluído depois (RNF13, RNF14, RN46, DT09).

## ADDED Requirements

### Requirement: Registro de auditoria de toda escrita do administrador
Toda operação de escrita feita por um administrador SHALL gravar uma linha de auditoria com: o administrador responsável, a ação no formato `recurso.ação` (ex.: `category.update`), o tipo e o identificador do registro afetado, os detalhes relevantes da ação e a data e hora. A gravação da auditoria SHALL fazer parte da mesma operação atômica da escrita: se a auditoria falhar, a escrita é desfeita; se a escrita falhar, nenhuma auditoria é gravada.

#### Scenario: Escrita bem-sucedida grava auditoria
- **WHEN** um administrador conclui uma operação de escrita
- **THEN** existe uma nova linha de auditoria com o identificador do administrador, a ação, o tipo e o identificador do registro afetado e a data e hora da operação

#### Scenario: Falha na gravação da auditoria
- **WHEN** a gravação da linha de auditoria falha durante uma escrita do administrador
- **THEN** a escrita inteira é desfeita e o administrador recebe erro

#### Scenario: Escrita recusada não gera auditoria
- **WHEN** uma escrita do administrador é recusada (validação ou conflito)
- **THEN** nenhuma linha de auditoria é gravada

### Requirement: Auditoria sobrevive à exclusão do administrador
A linha de auditoria SHALL guardar também o nome e o e-mail do administrador no momento da ação. Se o administrador for excluído permanentemente, as linhas dele SHALL continuar existindo, sem o vínculo com o usuário, mas com o nome e o e-mail gravados.

#### Scenario: Administrador excluído depois da ação
- **WHEN** um administrador que tem linhas de auditoria é excluído permanentemente
- **THEN** as linhas continuam no banco, com o vínculo ao usuário vazio e com o nome e o e-mail do administrador nos detalhes

### Requirement: Auditoria não guarda segredos
Os detalhes de uma linha de auditoria NÃO SHALL conter senha, token de sessão, código de verificação ou chave de acesso, mesmo quando a escrita auditada envolver esses dados.

#### Scenario: Escrita que envolve senha
- **WHEN** um administrador realiza uma escrita cujo corpo inclui uma senha
- **THEN** a linha de auditoria gravada não contém a senha em nenhum campo
