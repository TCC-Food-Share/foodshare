import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, IsNotEmpty, IsOptional, IsString, useContainer } from 'class-validator';

import {
  NoProhibitedContent,
  NoProhibitedContentConstraint,
} from '../content-moderation/no-prohibited-content.validator';
import { PrismaService } from '../prisma/prisma.service';
import { AppValidationPipe } from './app-validation.pipe';

class SampleDto {
  @IsString()
  @IsNotEmpty()
  @NoProhibitedContent()
  description!: string;

  @IsOptional()
  @IsString()
  @NoProhibitedContent()
  notes?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;
}

describe('AppValidationPipe', () => {
  const findMany = jest.fn<() => Promise<{ term: string }[]>>();
  const pipe = new AppValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (body: object) =>
    pipe.transform(body, { type: 'body', metatype: SampleDto }) as Promise<SampleDto>;
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

  it('accepts clean text and an absent optional field', async () => {
    await expect(run({ description: 'Alimento enviado' })).resolves.toMatchObject({
      description: 'Alimento enviado',
    });
  });

  it('rejects a prohibited term with the code and the field', async () => {
    const error = await failure({ description: 'Que MERDA!' });
    expect(error.getResponse()).toEqual({
      code: 'PROHIBITED_CONTENT',
      message: 'Text contains prohibited content.',
      fields: ['description'],
    });
  });

  it('reports every rejected field, for terms and links alike', async () => {
    const error = await failure({ description: 'site.com.br', notes: 'merda' });
    expect(error.getResponse()).toMatchObject({
      code: 'PROHIBITED_CONTENT',
      fields: ['description', 'notes'],
    });
  });

  it('does not reveal the matched term', async () => {
    const error = await failure({ description: 'merda' });
    expect(JSON.stringify(error.getResponse())).not.toContain('merda');
  });

  it('uses the current list on every validation', async () => {
    findMany.mockResolvedValueOnce([]);
    await expect(run({ description: 'palavra' })).resolves.toBeDefined();

    findMany.mockResolvedValueOnce([{ term: 'palavra' }]);
    await failure({ description: 'palavra' });

    findMany.mockResolvedValueOnce([]);
    await expect(run({ description: 'palavra' })).resolves.toBeDefined();
  });

  it('falls back to the default 400 when a format error comes along', async () => {
    const error = await failure({ description: 'merda', quantity: 'muitos' });
    const response = error.getResponse() as { code?: string; message: string[] };
    expect(response.code).toBeUndefined();
    expect(response.message).toContain('quantity must be an integer number');
  });

  it('keeps the default 400 body for other validation errors', async () => {
    const error = await failure({ description: '' });
    expect(error.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['description should not be empty'],
    });
  });

  it('keeps rejecting unknown fields', async () => {
    const error = await failure({ description: 'ok', image: 'http://x' });
    expect(error.getResponse()).toMatchObject({ message: ['property image should not exist'] });
  });
});
