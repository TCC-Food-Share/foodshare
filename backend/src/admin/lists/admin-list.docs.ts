import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiAdminListWrite = (conflicts: string) =>
  applyDecorators(
    ApiBadRequestResponse({ description: 'Dados inválidos.' }),
    ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' }),
    ApiNotFoundResponse({ description: 'Opção não encontrada.' }),
    ApiConflictResponse({ description: conflicts }),
  );
