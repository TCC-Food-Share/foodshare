# Workflow de Commits

Este projeto usa **Conventional Commits** validados automaticamente por `commitlint` e formatação automática via `husky` + `lint-staged`. Esta página é o passo a passo oficial — siga em todo commit.

Documento irmão: [BRANCHES.md](./BRANCHES.md), que padroniza o **nome das branches**.

---

## Regra de ouro

> **Toda mensagem de commit é uma única frase curta.**

Sem corpo, sem bullet list, sem parágrafo explicativo. Se você tem mais de uma coisa pra contar, são commits diferentes.

```
chore: configurar app Expo
```

Ruim:

```
chore: configurar app Expo

- adiciona ESLint
- adiciona Prettier
- ajusta tsconfig
- ...
```

Esses três bullets viram três commits.

---

## Formato

```
<tipo>(<escopo opcional>): <descrição>
```

- **tipo** — obrigatório, em minúsculo, da lista abaixo.
- **escopo** — opcional, em parênteses, descreve a área afetada (`auth`, `api`, `home`, `ci`).
- **descrição** — modo imperativo, minúscula, sem ponto final, ≤ 50 caracteres quando possível.

Bons exemplos:

```
feat: tela de cadastro de refeição
fix(auth): refresh token expirado não renova
chore(deps): atualiza expo para 54.0.34
refactor(home): extrai lista de receitas para componente
docs: adiciona guia de commits
test(api): cobre erro 401 do client
```

---

## Tipos permitidos

| Tipo       | Quando usar                                                             |
| ---------- | ----------------------------------------------------------------------- |
| `feat`     | Nova feature visível ao usuário.                                        |
| `fix`      | Correção de bug.                                                        |
| `refactor` | Mudança de código sem alterar comportamento externo.                    |
| `perf`     | Otimização de performance.                                              |
| `style`    | Formatação, espaçamento, ponto e vírgula. Sem mudança de lógica.        |
| `test`     | Adição ou ajuste de testes.                                             |
| `docs`     | Apenas documentação (`README`, `docs/`, JSDoc).                         |
| `build`    | Build system, dependências (`package.json`, `app.json`, EAS).           |
| `ci`       | Configuração de CI (GitHub Actions, EAS workflows).                     |
| `chore`    | Tarefas administrativas (config, scripts, sem mudança de código fonte). |
| `revert`   | Reverte um commit anterior.                                             |

Se a mudança quebra contrato público, adicione `!` antes dos `:`:

```
feat!: troca contrato do endpoint de login
```

---

## Passo a passo

### 1. Antes de codar

```bash
git status
git pull --rebase origin main
```

Garante base limpa e atualizada.

### 2. Faça mudanças pequenas e focadas

Uma feature ou um bugfix por vez. Se você tá tocando `auth` e percebeu um typo no `home`, **commit separado**.

### 3. Stage seletivo

```bash
git add caminho/arquivo.tsx
```

Evite `git add -A` ou `git add .` quando há mudanças misturadas. `git add -p` ajuda a separar hunks dentro do mesmo arquivo.

### 4. Commit com uma frase

```bash
git commit -m "feat: tela de login com biometria"
```

### 5. O que acontece automaticamente

Os hooks do Husky rodam nesta ordem:

1. **`pre-commit`** → `lint-staged` roda nos arquivos staged:
   - `*.{ts,tsx,js,jsx,mjs,cjs}` → `eslint --fix` + `prettier --write`
   - `*.{json,md,yml,yaml,css,html}` → `prettier --write`
   - `*.prisma` → `prisma format`
   - Se algum erro de lint não puder ser corrigido automaticamente, o commit é abortado.

   Cada projeto (`backend/`, `frontend/`) tem seu próprio `.lintstagedrc.json`, então o arquivo staged é sempre checado pelo ESLint do projeto a que ele pertence.

2. **`commit-msg`** → `commitlint` valida a mensagem contra `@commitlint/config-conventional`. Se o formato estiver errado, commit é abortado.

### 6. Push

```bash
git push origin <branch>
```

---

## Exemplos práticos

### Adicionando uma feature

```bash
git add app/\(tabs\)/recipes.tsx components/recipe-card.tsx
git commit -m "feat: lista de receitas favoritas"
```

### Corrigindo um bug

```bash
git add hooks/use-auth.ts
git commit -m "fix(auth): trata token expirado durante refresh"
```

### Atualizando dependências

```bash
git add package.json package-lock.json
git commit -m "chore(deps): atualiza expo-router para 6.0.24"
```

### Revertendo

```bash
git revert <hash>
# Mensagem auto-gerada já segue convenção: "revert: ..."
```

---

## Erros comuns e como resolver

**Mensagem rejeitada pelo commitlint**

```
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
```

Você esqueceu o tipo. Repita com formato `tipo: descrição`.

**Pre-commit aborta com erro de ESLint**

```bash
npm run lint              # roda eslint --fix nos dois projetos
# corrija manualmente o que sobrou
git add <arquivos>
git commit -m "..."
```

**Preciso desabilitar os hooks por algum motivo emergencial**

Não desabilite. Se o hook falhou, há algo errado — investigue antes. `--no-verify` está proibido neste projeto.

**Commit já feito com mensagem errada (ainda não pushed)**

```bash
git commit --amend -m "tipo: nova mensagem"
```

Só amend em commits que ainda **não** foram pushados.

---

## Resumo de uma linha

> Mensagem curta, formato `tipo: descrição`, hooks decidem se passa.
