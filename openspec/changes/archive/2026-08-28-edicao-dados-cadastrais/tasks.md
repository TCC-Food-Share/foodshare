## 1. Pré-requisito: autenticação

- [x] 1.1 Guard de autenticação (RF07/RF08) já existe e já se aplica globalmente por padrão (`@thallesp/nestjs-better-auth`) — nenhuma implementação nova necessária, só não decorar os endpoints novos com `@AllowAnonymous()`

## 2. DTOs e validação compartilhados

- [x] 2.1 Criado `backend/src/establishments/dto/update-establishment.dto.ts` com campos opcionais `personalPhone`, `institutionalPhone`, `institutionalEmail`, `image`, `description` (mesmas regras de formato de `create-establishment.dto.ts`) e `address?: AddressDto` reaproveitando `address.dto.ts`
- [x] 2.2 Criado `backend/src/beneficiary-entities/dto/update-beneficiary-entity.dto.ts` espelhando o DTO acima, reaproveitando o `AddressDto` de `establishments/dto/address.dto.ts`
- [x] 2.3 Corrigido em relação ao design original: o `ValidationPipe` global já usa `forbidNonWhitelisted: true` (não `false` como a v1 deste tasks.md assumia) — campo fora do DTO (CNPJ, razão social, e-mail pessoal, nome, nome fantasia, senha) rejeita a requisição inteira com 400, não descarta silenciosamente. Ver `design.md`.

## 3. Edição de estabelecimento

- [x] 3.1 `EstablishmentsService.update(userId, dto)`: busca o estabelecimento por `userId` (`findUnique`); `NotFoundException` se não existir (cobre também o caso de conta do tipo errado chamando o endpoint)
- [x] 3.2 Uniqueness check (`checkUpdateUniqueness`) só pros campos enviados, via `findFirst` com `NOT: { id }` excluindo o próprio registro — mesmo padrão do `checkUniqueness` do cadastro (RF02/RF04), adaptado
- [x] 3.3 Endereço como sub-objeto tudo-ou-nada — a validação do `AddressDto` (herdada, todos os campos obrigatórios dentro do sub-objeto) já cobre isso; confirmado manualmente (endereço parcial → 400)
- [x] 3.4 `User` (celular/imagem), `Address` (se enviado) e `Establishment` (celular institucional/e-mail institucional/descrição, se enviados) atualizados dentro de `prisma.$transaction`; `P2002` como rede de segurança, traduzido pra `ConflictException` genérica
- [x] 3.5 Retorna o estabelecimento atualizado no shape de `establishment-response.dto.ts` — `UserResponseDto` ganhou o campo `image` (não existia antes, RF05 é o primeiro fluxo que expõe/edita esse campo)
- [x] 3.6 `PATCH /establishments/me` em `establishments.controller.ts`, sem `@AllowAnonymous()` (guard global se aplica), `userId` extraído via `@Session()`

## 4. Edição de entidade beneficiária

- [x] 4.1 3.1–3.6 espelhados em `beneficiary-entities.service.ts`/`beneficiary-entities.controller.ts`: `update`, `checkUpdateUniqueness`, transação atômica, `PATCH /beneficiary-entities/me`, resposta no shape de `beneficiary-entity-response.dto.ts`

## 5. Testes

- [x] 5.1 Teste unitário (estabelecimento e entidade beneficiária): edição de um único campo (descrição) atualiza só esse campo, `tx.user.update`/`tx.address.update` não chamados
- [x] 5.2 Sem teste unitário de service pra "endereço parcial rejeitado" — é validação de DTO (`class-validator`), não lógica do service; camada não testada isoladamente em nenhum outro DTO deste projeto (mesma convenção de `create-establishment.dto.ts`). Coberto por verificação manual (`curl`, endereço faltando `city`/`state` → 400)
- [x] 5.3 Teste unitário (estabelecimento e entidade beneficiária): `institutionalPhone` já usado por outro cadastro → `ConflictException`, `tx.*.update` não chamado
- [x] 5.4 Sem teste unitário de service pra "payload com CNPJ/razão social é aceito e só edita os editáveis" — comportamento mudou (ver 2.3): esses campos agora rejeitam a requisição inteira (400), garantido pelo `ValidationPipe` global (`forbidNonWhitelisted: true`), infraestrutura já existente e não coberta por este change. Confirmado manualmente (`curl` com `cnpj` no body → 400, `"property cnpj should not exist"`)
- [x] 5.5 Testes de 5.1/5.3/5.6/5.7 espelhados pra entidade beneficiária
- [x] 5.6 Nenhum teste de "sem `userId` resolvido" — igual ao raciocínio original, guard já testado no change `autenticacao-login`. Teste novo adicionado no lugar: `NotFoundException` quando o `userId` resolvido não tem `Establishment`/`BeneficiaryEntity` vinculado (cobre conta do tipo errado)
- [x] 5.7 Teste unitário (estabelecimento e entidade beneficiária): `update` com dados válidos retorna os dados atualizados sem a senha
- [x] 5.8 (novo) Teste unitário: uniqueness check exclui o próprio registro (`NOT: { id }`) — sem isso, editar um cadastro sem mudar o e-mail institucional bateria "duplicado" contra si mesmo
- [x] 5.9 (novo) Verificação manual ponta a ponta (`curl`): cadastro → login → edita descrição (200) → tenta editar CNPJ (400) → edita sem sessão (401) → endereço parcial (400) → endereço completo (200) → cria 2º cadastro, tenta reusar e-mail institucional dele (409) → conta de tipo errado chamando o endpoint do outro tipo (404)
