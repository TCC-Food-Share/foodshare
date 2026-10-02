## Why

O cadastro de estabelecimento (RF01) hoje só rejeita CNPJ/e-mail/celular duplicados de forma indireta: o banco recusa o `INSERT` pela constraint única e o service captura o erro genérico do Prisma (`P2002`), devolvendo sempre a mesma mensagem ("CNPJ, e-mail ou celular já cadastrado") sem dizer qual campo colidiu. RF02 exige impedir esse cadastro duplicado com uma resposta que permita ao usuário corrigir o campo certo — hoje ele só sabe que *algum* campo colidiu, não qual.

## What Changes

- Antes de criar o registro, o service consulta o banco por valores já cadastrados de `email`, `celularPessoal` (em `Usuario`), `cnpj`, `emailInstitucional` e `celularInstitucional` (em `Estabelecimento`) e reporta **todos** os campos duplicados encontrados numa única resposta de erro (409), em vez de um por tentativa.
- A constraint única do banco continua como rede de segurança: se dois cadastros concorrentes colidirem entre a checagem prévia e o `INSERT` (condição de corrida), o `P2002` capturado hoje continua tratado — response nesse caso permanece genérica (sem lista de campos), pois nesse ponto não é mais viável remontar quais colidiram sem uma segunda consulta.
- Nenhum registro (`Usuario`, `Endereco`, `Estabelecimento`) é criado quando há duplicidade — mantém a atomicidade já garantida pela transação existente.

## Capabilities

### Modified Capabilities
- `estabelecimentos/cadastro`: adiciona requisito de unicidade de CNPJ, e-mail e celular no cadastro de estabelecimento (RF02), com resposta de erro que identifica os campos duplicados.

## Impact

- **Backend**: `estabelecimentos.service.ts` — nova checagem de unicidade antes da transação de criação; `estabelecimentos.controller.ts` não muda de assinatura. Nenhuma alteração de schema (`Usuario.email`, `Usuario.celularPessoal`, `Estabelecimento.cnpj`, `Estabelecimento.emailInstitucional`, `Estabelecimento.celularInstitucional` já são `@unique`).
- **Frontend**: fora desta change — sem tela de cadastro ainda (ver change `cadastro-estabelecimento`).
- **Fora desta change**: unicidade para entidade beneficiária (RF04) — change própria, mesmo padrão.
