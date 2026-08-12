# Workflow de Branches

Este projeto usa **[Conventional Branch](https://conventionalbranch.org/)** para nomear branches. Esta página é o passo a passo oficial — siga toda vez que criar uma branch.

Documento irmão: [COMMITS.md](./COMMITS.md), que padroniza as **mensagens de commit**.

---

## Regra de ouro

> **`<tipo>/<descrição-em-kebab-case>`, tudo minúsculo.**

```
feat/cadastro-de-refeicao
fix/token-expirado-nao-renova
chore/atualiza-eslint
```

O nome da branch responde "que tipo de mudança é essa?" antes mesmo de alguém abrir o diff.

---

## Formato

```
<tipo>/<descrição>
```

- **tipo** — obrigatório, da lista abaixo. Sempre minúsculo.
- **`/`** — separador obrigatório entre tipo e descrição.
- **descrição** — kebab-case: palavras separadas por hífen.

Branches de tronco (`main`, `develop`) são a exceção: **não levam prefixo**.

---

## Tipos permitidos

| Tipo                  | Quando usar                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `feat/` ou `feature/` | Nova funcionalidade.                                                |
| `fix/` ou `bugfix/`   | Correção de bug.                                                    |
| `hotfix/`             | Correção urgente, normalmente direto em produção.                   |
| `release/`            | Preparação de release.                                              |
| `chore/`              | Tarefas que não são código de produção: deps, config, docs, testes. |

**Escolha um dos dois nomes e mantenha.** `feat/` e `feature/` são equivalentes na spec, mas misturar os dois no mesmo repo atrapalha busca e automação. **Neste projeto usamos as formas curtas: `feat/` e `fix/`.**

### Onde entram docs, refactor, test e style?

O Conventional **Commits** tem mais tipos (`docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`) do que o Conventional **Branch**. Isso é intencional: a spec de branches é deliberadamente menor.

Então `docs/`, `refactor/`, `test/`, `style/`, `perf/` **não são prefixos de branch válidos**. Essas mudanças vão em `chore/`:

```bash
# Errado — prefixo não existe na spec
git switch -c docs/guia-de-branches
git switch -c refactor/extrai-lista

# Certo
git switch -c chore/guia-de-branches
git switch -c chore/extrai-lista-de-receitas
```

O commit **dentro** dessa branch continua usando o tipo específico:

```bash
git switch -c chore/guia-de-branches
git commit -m "docs: adiciona guia de nomenclatura de branches"
```

Branch responde "que tipo de trabalho", commit responde "que tipo de mudança". Não precisam bater.

### Prefixos de agente de IA

A spec (v1.1.0+) reserva prefixos para branches geradas por agentes: `ai/`, `claude/`, `codex/`, `copilot/`, `cursor/`.

Use quando o objetivo é **sinalizar a origem** do código para quem revisa. Se o trabalho do agente é normal e revisado como qualquer outro, prefira o prefixo por propósito (`feat/`, `fix/`).

---

## Regras de caracteres

Permitido:

- letras minúsculas `a-z`
- números `0-9`
- hífen `-` como separador de palavras
- ponto `.` **apenas** em números de versão (`release/v1.2.0`)

Proibido:

- letras maiúsculas
- espaços, underscore `_`, acentos e caracteres especiais
- hífen ou ponto no começo ou no fim
- hífens ou pontos consecutivos
- prefixo fora da lista de tipos

| Inválido                 | Por quê                     | Válido                   |
| ------------------------ | --------------------------- | ------------------------ |
| `Feature/Add-Login`      | maiúsculas                  | `feat/add-login`         |
| `feat/new--login`        | hífen duplo                 | `feat/new-login`         |
| `feat/-new-login`        | hífen no começo             | `feat/new-login`         |
| `feat/new login`         | espaço                      | `feat/new-login`         |
| `feat/new_login`         | underscore                  | `feat/new-login`         |
| `feat/cadastro-refeição` | acento                      | `feat/cadastro-refeicao` |
| `melhorias`              | sem tipo                    | `chore/melhorias`        |
| `docs/api`               | `docs` não é tipo de branch | `chore/docs-api`         |

> Sobre acento: `ç` e `ã` funcionam no git, mas quebram em ferramentas de CI, URLs e sistemas de arquivos que normalizam Unicode de formas diferentes. Escreva sem acento.

---

## Descrição: como escrever

Descritiva, porém curta. Mire em **2 a 4 palavras**.

```bash
# Vago demais
chore/ajustes
fix/bug

# Longo demais
feat/adiciona-tela-de-cadastro-de-refeicao-com-validacao-e-upload-de-foto

# Bom
feat/cadastro-de-refeicao
fix/refresh-token-expirado
```

Se você não consegue descrever a branch em poucas palavras, provavelmente ela está fazendo coisas demais — quebre em branches menores.

### Código do requisito (RF/RNF)

Neste projeto o identificador não é número de ticket — é o código do requisito em `docs/REQUISITOS.md`. Coloque-o logo após o tipo, minúsculo, sem hífen entre a sigla e o número:

```
feat/rf02-unicidade-estabelecimento
fix/rnf08-hash-senha
```

O código já aponta pro requisito completo — a descrição depois dele pode (e deve) ser bem mais curta que o normal: **1 a 2 palavras**, só o suficiente pra diferenciar de outra branch com o mesmo código.

```bash
# Vago demais (sem o código, ninguém sabe qual requisito é)
feat/unicidade-cadastro-estabelecimento

# Bom
feat/rf02-unicidade-estabelecimento
```

Se a mudança não corresponde a nenhum RF/RNF (ex: `chore/`), omita o código e use a descrição normal de 2 a 4 palavras.

Se cobrir mais de um requisito, use o principal — o que melhor identifica o propósito da branch — e não liste todos.

---

## Passo a passo

### 1. Atualize a base

Neste projeto branches saem de **`develop`**, não de `main`.

```bash
git switch develop
git pull --rebase origin develop
```

### 2. Crie a branch

```bash
git switch -c feat/cadastro-de-refeicao
```

> `git switch -c` é o comando moderno. `git checkout -b` faz o mesmo.

### 3. Trabalhe e commite

Mensagens seguem [COMMITS.md](./COMMITS.md).

```bash
git add src/refeicoes/refeicao.service.ts
git commit -m "feat: cria service de refeição"
```

### 4. Publique

```bash
git push -u origin feat/cadastro-de-refeicao
```

O `-u` liga a branch local à remota; nos próximos pushes basta `git push`.

### 5. Abra o PR para `develop`

Depois do merge, limpe:

```bash
git switch develop
git pull --rebase origin develop
git branch -d feat/cadastro-de-refeicao
git push origin --delete feat/cadastro-de-refeicao
```

---

## Uma branch, um assunto

Mesmo princípio do COMMITS.md: se a branch mistura assuntos, o PR fica difícil de revisar e impossível de reverter em partes.

```bash
# Ruim: uma branch com tudo
chore/melhorias-gerais

# Bom: uma por assunto
chore/lint-and-format-setup
fix/bootstrap-error-handling
feat/database-setup
```

---

## Erros comuns

**Criei a branch com nome errado (ainda não pushei)**

```bash
git branch -m feat/nome-correto
```

**Já pushei com nome errado**

```bash
git branch -m nome-antigo nome-novo
git push origin -u nome-novo
git push origin --delete nome-antigo
```

Avise quem já baixou a branch — o nome antigo vai ficar obsoleto localmente.

**Comecei a codar direto na `develop`**

```bash
git switch -c feat/minha-feature   # leva as mudanças não commitadas junto
```

Se você já commitou em `develop`:

```bash
git switch -c feat/minha-feature   # branch nova aponta pro commit
git switch develop
git reset --hard origin/develop    # devolve develop ao estado remoto
```

> `git reset --hard` descarta mudanças não commitadas. Confirme que seu trabalho está na branch nova antes de rodar.

---

## Resumo de uma linha

> `tipo/descricao-em-kebab-case`, minúsculo, sem acento, tipo vindo de `feat` `fix` `hotfix` `release` `chore`.
