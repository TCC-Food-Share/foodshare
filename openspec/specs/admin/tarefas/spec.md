# admin/tarefas Specification

## Purpose

Permitir que o administrador execute sob demanda uma tarefa agendada do sistema, para testar sem esperar o horário programado (`docs/INFRAESTRUTURA.md`, "Tarefas agendadas"). Nesta etapa nenhuma tarefa existe ainda.

## Requirements

### Requirement: Execução manual de tarefa pelo administrador
O sistema SHALL oferecer uma operação, restrita ao administrador, que executa imediatamente uma tarefa do sistema identificada pelo nome. Quando a tarefa existe, a resposta SHALL informar o nome da tarefa e quantos registros ela afetou, e a execução SHALL ser registrada na auditoria. Quando não existe tarefa com o nome informado, a resposta SHALL ser `404` com `code: JOB_NOT_FOUND`, sem registro na auditoria. Enquanto nenhuma tarefa estiver cadastrada, todo nome SHALL resultar em `JOB_NOT_FOUND`.

#### Scenario: Nome de tarefa inexistente
- **WHEN** um administrador pede a execução de uma tarefa com um nome que não está cadastrado
- **THEN** o sistema responde `404` com `code: JOB_NOT_FOUND` e não grava auditoria

#### Scenario: Nenhuma tarefa cadastrada ainda
- **WHEN** um administrador pede a execução de qualquer tarefa antes de a fase de automação existir
- **THEN** o sistema responde `404` com `code: JOB_NOT_FOUND`

#### Scenario: Instituição tenta executar tarefa
- **WHEN** um estabelecimento ou entidade beneficiária pede a execução de uma tarefa
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED` e nada é executado
