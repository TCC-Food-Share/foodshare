## 1. Pré-requisito: autenticação

- [ ] 1.1 Confirmar que existe um guard de autenticação reutilizável (RF07) que resolve o `User` autenticado a partir da requisição; se ainda não existir no momento de aplicar este change, implementar o mínimo necessário (guard + decorator de usuário atual) antes de seguir para as tarefas 2–4, sem expandir para o restante do escopo de RF07/RF08/RF09

## 2. DTOs e validação compartilhados

- [ ] 2.1 Criar `backend/src/establishments/dto/update-establishment.dto.ts` com campos opcionais `personalPhone`, `institutionalPhone`, `institutionalEmail`, `image`, `description` (mesmas regras de formato de `create-establishment.dto.ts`) e `address?: AddressDto` reaproveitando `address.dto.ts` (todos os subcampos obrigatórios quando `address` é enviado)
- [ ] 2.2 Criar `backend/src/beneficiary-entities/dto/update-beneficiary-entity.dto.ts` espelhando o DTO acima para entidade beneficiária, reaproveitando o `AddressDto` de `establishments/dto/address.dto.ts`
- [ ] 2.3 Confirmar que o `ValidationPipe` global está com `whitelist: true` (e `forbidNonWhitelisted: false`) para que campos fora do DTO (CNPJ, razão social, e-mail pessoal, nome, nome fantasia, senha) sejam descartados em vez de gerar erro

## 3. Edição de estabelecimento

- [ ] 3.1 Em `establishments.service.ts`, adicionar `update(userId: number, dto: UpdateEstablishmentDto)`: buscar o estabelecimento pelo `userId` do usuário autenticado (nunca por um id vindo do cliente)
- [ ] 3.2 Se `personalPhone`, `institutionalPhone` ou `institutionalEmail` vierem no dto, consultar em paralelo (`Promise.all`) os `findUnique` correspondentes, excluindo o próprio registro (`NOT: { id }` / `NOT: { userId }`), e lançar `ConflictException` com os campos duplicados se houver colisão — mesmo padrão de `checkUniqueness` do change `unicidade-cadastro-entidade-beneficiaria`
- [ ] 3.3 Se `address` vier no dto, validar que os 6 subcampos estão presentes (a validação do DTO já cobre isso) e incluir o update do `Address` vinculado na mesma transação
- [ ] 3.4 Persistir os updates de `User` (telefones/imagem), `Address` (se enviado) e `Establishment` (telefone institucional/e-mail institucional/descrição, se enviados) dentro de `prisma.$transaction`, capturando `P2002` como rede de segurança e traduzindo para `ConflictException` genérica
- [ ] 3.5 Retornar o estabelecimento atualizado usando o mesmo shape de `establishment-response.dto.ts` (sem senha)
- [ ] 3.6 Em `establishments.controller.ts`, adicionar `PATCH /establishments/me` protegido pelo guard de autenticação (tarefa 1.1), extraindo o usuário autenticado via decorator e chamando `update`

## 4. Edição de entidade beneficiária

- [ ] 4.1 Repetir 3.1–3.6 para `beneficiary-entities.service.ts` / `beneficiary-entities.controller.ts`: método `update`, checagem de unicidade excluindo o próprio registro, transação atômica, endpoint `PATCH /beneficiary-entities/me`, resposta no shape de `beneficiary-entity-response.dto.ts`

## 5. Testes

- [ ] 5.1 Teste unitário (estabelecimento): edição de um único campo (ex: descrição) atualiza somente esse campo
- [ ] 5.2 Teste unitário (estabelecimento): edição com endereço parcial (faltando subcampo) é rejeitada sem alterar nada
- [ ] 5.3 Teste unitário (estabelecimento): edição com telefone institucional já usado por outro cadastro retorna `ConflictException` e não persiste nada
- [ ] 5.4 Teste unitário (estabelecimento): payload incluindo CNPJ/razão social junto de campos editáveis válidos aplica só os editáveis e mantém CNPJ/razão social intactos
- [ ] 5.5 Repetir 5.1–5.4 para entidade beneficiária
- [ ] 5.6 Teste unitário: `update` chamado sem um `userId` resolvido (guard não aplicado) não é um caminho alcançável pelo service — a exigência de autenticação é responsabilidade do guard global, testada uma vez no change `autenticacao-login`; não repetir aqui
- [ ] 5.7 Teste unitário (estabelecimento e entidade beneficiária): `update` com dados válidos retorna os dados atualizados sem a senha
