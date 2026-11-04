## Context

Motivação em `proposal.md`, comportamento em `specs/moderacao/textos-livres/spec.md`.

Estado atual que molda a solução:

- `prohibited_term` guarda os termos já normalizados por `normalizeText` (`common/normalize-text.ts`), e o painel da 1.3 faz o CRUD.
- O `ValidationPipe` global (`main.ts`) responde `400` com `message: string[]`, sem `code`. Nenhum validador do projeto usa injeção de dependência: não há `useContainer` nem `@ValidatorConstraint`.
- As rotas com imagem usam multipart. O `FileInterceptor` deixa o arquivo em memória, os pipes rodam depois dele, e `storage.store` só é chamado dentro do service. Recusar no pipe, portanto, não deixa objeto órfão no MinIO.
- O frontend já lê `fields` do `409` de duplicidade e usa `form.setError` por campo. Não há testes automatizados no frontend.

## Goals / Non-Goals

**Goals:**

- Uma única regra, reaplicável pelas próximas changes com uma linha no DTO.
- Recusar antes de qualquer efeito colateral: conta, imagem ou escrita no banco.
- Manter idêntico o corpo dos demais `400` de validação.

**Non-Goals:**

- Cache da lista de termos.
- Validação no navegador: os termos não podem ser expostos (`listas/consulta`), e duplicar só a regra de links daria dois comportamentos para manter.
- Detecção de grafias disfarçadas, e revisão de textos já gravados.

## Decisions

### Decorator `class-validator` com validador assíncrono

`@NoProhibitedContent()` nos DTOs, implementado por um `@ValidatorConstraint({ async: true })` injetável, que lê os termos pelo `PrismaService`. Exige `useContainer(app.select(AppModule), { fallbackOnErrors: true })` em `main.ts`.

- **Por quê:** a regra fica declarada junto das outras do campo, roda antes do service e cobre qualquer rota que use o DTO.
- **Alternativa recusada:** chamar um serviço em cada service de domínio. Depende de lembrar a chamada em cada rota, e o plano pede decorator ou pipe.
- **Alternativa recusada:** pipe por rota. Precisaria repetir a lista de campos fora do DTO.

### Subclasse do `ValidationPipe` para traduzir o erro

`AppValidationPipe` sobrescreve `createExceptionFactory()`. Se **todos** os erros vierem só da regra de conteúdo, responde `{ code: 'PROHIBITED_CONTENT', message, fields }`. Caso contrário, delega para a fábrica original.

- **Por quê:** preserva byte a byte os outros `400`, sem reimplementar o achatamento de mensagens.
- **Formato misto:** o erro de formato vence, porque o frontend só o produz em chamada direta à API (o zod barra antes). Assim o `code` significa sempre "basta corrigir estes textos".
- **`fields` no plural:** dois campos podem falhar juntos (descrição e observações), e é o mesmo nome do `409` de duplicidade. O plano fala em "o nome do campo"; a lista atende a esse caso.
- **Só campos de primeiro nível:** nenhum campo decorado é aninhado (`address` está fora), então não há recursão em `children`.

### Módulo `content-moderation/` com regra pura separada

- `prohibited-content.ts`: funções puras `containsProhibitedTerm(text, terms)` e `containsLink(text)`, testáveis sem Nest.
- `no-prohibited-content.validator.ts`: o validador, com a leitura do banco, e o decorator.
- `content-moderation.module.ts`: registra o validador, importado no `AppModule`.
- `app-validation.pipe.ts`: em `common/`, por ser usado em `main.ts`.

### Comparação por palavra inteira, por tokens

Texto e termo passam por `normalizeText`, e todo caractere que não for letra ou número vira espaço, com espaços colapsados. O termo casa se `" " + texto + " "` contém `" " + termo + " "`. Termo que fique vazio depois disso é ignorado.

- **Por quê:** resolve pontuação, termo com várias palavras e "disputa" × "puta" sem montar regex a partir de dado do banco, o que evita escapes e backtracking.

### Links por regex, sobre o texto normalizado

Quatro padrões, sem depender da tabela:

1. esquema: `[a-z][a-z0-9+.-]*://`;
2. `www.` seguido de texto;
3. e-mail: `texto@dominio.letras`, com qualquer terminação (`fulano@empresa.es`);
4. domínio: rótulos separados por ponto, terminados em uma TLD da lista fixa e em fronteira de palavra, ou seguidos de `/` e texto, com qualquer terminação de letras.

Lista de TLDs: `com`, `net`, `org`, `br`, `gov`, `edu`, `io`, `co`, `info`, `biz`, `xyz`, `site`, `online`, `store`, `shop`, `app`, `link`, `ly`, `tv`, `gg`.

- **Lista fixa, em vez de qualquer `palavra.letras`:** evita recusar `18h.Trazer` e `Retirar.Amanha`, comuns por falta de espaço.
- **`me` fora da lista:** `Ltda.ME` é comum em nome de empresa. O `wa.me/...` continua bloqueado pela regra do caminho, e `wa.me` sozinho não leva a lugar nenhum.
- **`com` exige fronteira:** `site.comida` não casa.

### Mensagem única no frontend

`lib/prohibited-content.ts` exporta `prohibitedContentFields(error)` e a mensagem "Este texto contém palavras não permitidas ou links. Revise o texto." Cada tela trata o caso antes do ramo genérico de `400`.

- **Mesmo `code` para termo e link:** é o que o plano define, e a mensagem cobre os dois casos.
- **Cadastro em etapas:** `tradeName` e `description` entram em `FIELD_TO_STEP` na etapa 1, sem banner, reaproveitando o `setStep` já usado para duplicidade.

### Leitura do banco a cada validação, sem cache

Cada campo decorado faz um `findMany` em `prohibited_term` (no máximo dois por requisição hoje, e a lista tem dezenas de linhas).

- **Por quê:** garante o "sem novo deploy" de forma trivial. Um cache exigiria invalidação a partir do CRUD do painel para um ganho imperceptível.

## Risks / Trade-offs

- [Cadastro anônimo passa a consultar o banco antes de recusar] → As duas rotas já têm limite de 10 por hora por IP (DT20), e a consulta é pequena.
- [Falso positivo por falta de espaço, como `Entregue.com cuidado`] → Raro, e o erro aparece no campo com orientação para revisar o texto.
- [Termo legítimo em certo contexto, como "retardado" em "efeito retardado"] → O administrador ajusta a lista no painel, sem deploy.
- [Texto antigo com termo cadastrado depois trava a edição de perfil, porque o `PATCH` sempre envia a descrição] → Aceito: o erro aparece na própria descrição, e corrigi-la libera a edição.
- [Falha no banco durante a validação vira `500`] → Aceito: sem banco, o cadastro também não funcionaria.
- [`useContainer` é global no `class-validator`] → `fallbackOnErrors: true` mantém os validadores nativos. Validar nos testes do pipe que eles seguem funcionando.
- [Próximas changes esquecerem o decorator] → Regra em `docs/CONVENCOES.md` e lembretes nos itens 1.5, 4.2, 5.2 e 5.4 do plano.

## Migration Plan

Sem migration nem variável de ambiente. O deploy ativa a validação para novas escritas, e o rollback é reverter o código. Textos já gravados continuam como estão.
