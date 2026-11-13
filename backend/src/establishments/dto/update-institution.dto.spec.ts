import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';

import { UpdateBeneficiaryEntityDto } from '../../beneficiary-entities/dto/update-beneficiary-entity.dto';
import { AppValidationPipe } from '../../common/app-validation.pipe';
import { NoProhibitedContentConstraint } from '../../content-moderation/no-prohibited-content.validator';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEstablishmentDto } from './update-establishment.dto';

describe.each([
  ['UpdateEstablishmentDto', UpdateEstablishmentDto],
  ['UpdateBeneficiaryEntityDto', UpdateBeneficiaryEntityDto],
])('%s', (_name, metatype) => {
  const findMany = jest.fn<() => Promise<{ term: string }[]>>();
  const pipe = new AppValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (body: object) =>
    pipe.transform(body, { type: 'body', metatype }) as Promise<{
      tradeName?: string | null;
      name?: string;
    }>;
  const failure = async (body: object): Promise<BadRequestException> => {
    const error = await run(body).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadRequestException);
    return error as BadRequestException;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NoProhibitedContentConstraint,
        { provide: PrismaService, useValue: { prohibitedTerm: { findMany } } },
      ],
    }).compile();
    useContainer(moduleRef, { fallbackOnErrors: true });
  });

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([{ term: 'merda' }]);
  });

  it('accepts and trims the trade name and the responsible name', async () => {
    await expect(run({ tradeName: '  Good Taste ', name: ' Ana Lima ' })).resolves.toMatchObject({
      tradeName: 'Good Taste',
      name: 'Ana Lima',
    });
  });

  it.each(['', '   '])('turns the trade name %j into null', async (tradeName) => {
    await expect(run({ tradeName })).resolves.toMatchObject({ tradeName: null });
  });

  it('keeps the trade name absent when it is not sent', async () => {
    const result = await run({ description: 'ok' });
    expect(result.tradeName).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  it('rejects a trade name over 200 characters', async () => {
    await failure({ tradeName: 'a'.repeat(201) });
  });

  it.each(['', '   '])('rejects the responsible name %j', async (name) => {
    const error = await failure({ name });
    expect(error.getResponse()).toMatchObject({ message: ['name should not be empty'] });
  });

  it('rejects a responsible name over 200 characters', async () => {
    await failure({ name: 'a'.repeat(201) });
  });

  it.each([
    ['companyName', 'New Company Ltd'],
    ['cnpj', '12345678000190'],
    ['email', 'new@example.com'],
  ])('keeps rejecting %s as a non-editable field', async (field, value) => {
    const error = await failure({ name: 'Ana Lima', [field]: value });
    expect(error.getResponse()).toMatchObject({
      message: [`property ${field} should not exist`],
    });
  });

  it.each(['Que merda', 'meusite.com.br'])(
    'rejects %j in the trade name as prohibited content',
    async (tradeName) => {
      const error = await failure({ tradeName });
      expect(error.getResponse()).toMatchObject({
        code: 'PROHIBITED_CONTENT',
        fields: ['tradeName'],
      });
    },
  );

  it('does not check the responsible name for prohibited content', async () => {
    await expect(run({ name: 'Merda Silva' })).resolves.toMatchObject({ name: 'Merda Silva' });
  });
});
