import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createVerificationCodeSender, type EmailClient } from './verification-code';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('createVerificationCodeSender', () => {
  const findUnique = jest.fn<() => Promise<{ deleted: boolean } | null>>();
  const prisma = { user: { findUnique } };
  const send = jest.fn<EmailClient['send']>();
  const logger = { error: jest.fn(), warn: jest.fn() };

  const sender = (overrides: Parameters<typeof createVerificationCodeSender>[1] = {}) =>
    createVerificationCodeSender(prisma, {
      apiKey: 're_test',
      fromAddress: 'nao-responda@foodshare.com.br',
      isProduction: true,
      client: { send },
      logger,
      ...overrides,
    });

  beforeEach(() => {
    findUnique.mockReset();
    send.mockReset();
    logger.error.mockReset();
    logger.warn.mockReset();
    findUnique.mockResolvedValue({ deleted: false });
    send.mockResolvedValue({ error: null });
  });

  it('envia o código de recuperação para conta ativa', async () => {
    await sender()({ email: 'a@a.com', otp: '123456', type: 'forget-password' });
    await flush();

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Food Share <nao-responda@foodshare.com.br>',
        to: 'a@a.com',
        subject: 'Seu código de recuperação de senha – Food Share',
      }),
    );
    const message = send.mock.calls[0][0];
    expect(message.text).toContain('123456');
    expect(message.html).toContain('123456');
  });

  it('envia o código de confirmação de e-mail com o assunto próprio', async () => {
    await sender()({ email: 'a@a.com', otp: '654321', type: 'email-verification' });
    await flush();

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Confirme seu e-mail – Food Share' }),
    );
    expect(send.mock.calls[0][0].text).toContain('654321');
  });

  it('não envia para conta excluída logicamente', async () => {
    findUnique.mockResolvedValue({ deleted: true });

    await sender()({ email: 'a@a.com', otp: '123456', type: 'forget-password' });
    await flush();

    expect(send).not.toHaveBeenCalled();
  });

  it('não envia para e-mail não cadastrado', async () => {
    findUnique.mockResolvedValue(null);

    await sender()({ email: 'nao@existe.com', otp: '123456', type: 'email-verification' });
    await flush();

    expect(send).not.toHaveBeenCalled();
  });

  it('ignora outros tipos de código', async () => {
    await sender()({ email: 'a@a.com', otp: '123456', type: 'sign-in' });
    await flush();

    expect(findUnique).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('responde antes de a entrega terminar', async () => {
    let release!: () => void;
    findUnique.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ deleted: false });
      }),
    );

    await sender()({ email: 'a@a.com', otp: '123456', type: 'forget-password' });
    expect(send).not.toHaveBeenCalled();

    release();
    await flush();
    expect(send).toHaveBeenCalled();
  });

  it('registra erro devolvido pelo SDK sem o código no log', async () => {
    send.mockResolvedValue({ error: { message: 'domain not verified' } });

    await expect(
      sender()({ email: 'a@a.com', otp: '123456', type: 'forget-password' }),
    ).resolves.toBeUndefined();
    await flush();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(String(logger.error.mock.calls[0][0])).not.toContain('123456');
  });

  it('registra exceção da entrega sem rejeitar a promessa devolvida', async () => {
    send.mockRejectedValue(new Error('network down'));

    await expect(
      sender()({ email: 'a@a.com', otp: '123456', type: 'email-verification' }),
    ).resolves.toBeUndefined();
    await flush();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(String(logger.error.mock.calls[0][0])).not.toContain('123456');
  });

  it('em dev sem chave, loga o código e não chama o Resend', async () => {
    await sender({ apiKey: '', client: undefined, isProduction: false })({
      email: 'a@a.com',
      otp: '123456',
      type: 'forget-password',
    });
    await flush();

    expect(send).not.toHaveBeenCalled();
    expect(String(logger.warn.mock.calls[0][0])).toContain('123456');
  });

  it('em produção sem chave, registra erro sem o código', async () => {
    await sender({ apiKey: '', client: undefined, isProduction: true })({
      email: 'a@a.com',
      otp: '123456',
      type: 'forget-password',
    });
    await flush();

    expect(send).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(String(logger.error.mock.calls[0][0])).not.toContain('123456');
  });
});
