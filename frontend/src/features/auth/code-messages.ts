import { ApiError, errorCode } from '@/lib/api';

/** `stay`: corrige e tenta de novo na mesma etapa. `request-new`: o código não vale mais. */
export type CodeErrorAction = 'stay' | 'request-new';

export interface CodeError {
  message: string;
  action: CodeErrorAction;
}

const GENERIC = 'Não foi possível concluir agora. Tente novamente em instantes.';

function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

/** Erro ao pedir ou reenviar um código (limite de 1 a cada 10 minutos por IP). */
export function codeRequestError(error: unknown): CodeError {
  if (error instanceof ApiError && error.status === 429) {
    const base = 'Você só pode pedir um código a cada 10 minutos.';
    return {
      message: error.retryAfter
        ? `${base} Tente de novo em ${minutesLabel(error.retryAfter)}.`
        : base,
      action: 'stay',
    };
  }
  return { message: GENERIC, action: 'stay' };
}

/**
 * Erro ao conferir o código (etapa do código) ou ao usá-lo (etapa da nova
 * senha). Na nova senha, código inválido significa código já usado ou
 * substituído, então a saída é pedir outro.
 */
export function codeVerifyError(error: unknown, stage: 'code' | 'use' = 'code'): CodeError {
  if (error instanceof ApiError && error.status === 429) {
    return {
      message: 'Muitas tentativas seguidas. Aguarde um instante e tente de novo.',
      action: 'stay',
    };
  }

  switch (errorCode(error)) {
    case 'INVALID_OTP':
      return stage === 'code'
        ? { message: 'Código incorreto. Confira o e-mail e tente de novo.', action: 'stay' }
        : { message: 'Este código não vale mais. Peça um novo código.', action: 'request-new' };
    case 'OTP_EXPIRED':
      return { message: 'Este código expirou. Peça um novo código.', action: 'request-new' };
    case 'TOO_MANY_ATTEMPTS':
      return {
        message: 'Você errou o código muitas vezes. Peça um novo código.',
        action: 'request-new',
      };
    default:
      return { message: GENERIC, action: 'stay' };
  }
}
