import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { useContainer } from 'class-validator';
import express from 'express';
import { join } from 'path';

import { createAccessLogMiddleware } from './access-log/access-log.middleware';
import { AccessLogService } from './access-log/access-log.service';
import { AppModule } from './app.module';
import { auth, trustedOrigins } from './auth/auth.instance';
import { AppValidationPipe } from './common/app-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', 1);
  const accessLog = app.get(AccessLogService);
  app.use(
    createAccessLogMiddleware({
      record: (entry) => accessLog.record(entry),
      resolveUserIdFromCookie: async (cookie) => {
        const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
        return session ? Number(session.user.id) : null;
      },
    }),
  );
  app.enableCors({
    origin: trustedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // Tempo restante do limite de pedidos de código (429 do better-auth).
    exposedHeaders: ['X-Retry-After'],
  });
  app.useStaticAssets(join(process.cwd(), 'public'));
  app.use(express.json());
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(
    new AppValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Food Share API')
    .setDescription(
      'API da plataforma Food Share, conecta estabelecimentos com excedentes ' +
        'alimentares a entidades beneficiárias.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, { autoTagControllers: false });
  const authSchema = await auth.api.generateOpenAPISchema();
  const hiddenAuthPaths = new Set(['/ok', '/error']);
  const authOperationOverrides: Record<string, { summary: string; description: string }> = {
    '/sign-in/email': {
      summary: 'Login',
      description:
        'Autentica com e-mail e senha e, em caso de sucesso, emite uma sessão (cookie). ' +
        'Conta com e-mail ainda não confirmado responde 403 com code EMAIL_NOT_VERIFIED ' +
        '(senha errada continua 401 genérico).',
    },
    '/sign-out': {
      summary: 'Logout',
      description: 'Encerra a sessão atual, invalidando o cookie de sessão.',
    },
    '/email-otp/request-password-reset': {
      summary: 'Pedir código de recuperação de senha',
      description:
        'Envia um código de 6 dígitos, válido por 10 minutos, ao e-mail informado. A resposta é ' +
        'a mesma para e-mail não cadastrado ou de conta excluída, e nesses casos nada é enviado. ' +
        'Limite de 1 pedido a cada 10 minutos por IP: acima disso, 429 com o header X-Retry-After.',
    },
    '/email-otp/check-verification-otp': {
      summary: 'Conferir código',
      description:
        'Confere o código sem consumi-lo (use type forget-password na recuperação de senha). ' +
        'Cada código errado conta uma tentativa; na 3ª o código é invalidado.',
    },
    '/email-otp/reset-password': {
      summary: 'Redefinir senha com o código',
      description:
        'Troca a senha (8 a 72 caracteres) com o código de recuperação, descarta o código, ' +
        'confirma o e-mail e encerra todas as sessões da conta.',
    },
    '/email-otp/verify-email': {
      summary: 'Confirmar e-mail com o código',
      description:
        'Confirma o e-mail da conta com o código enviado no cadastro. Não abre sessão: ' +
        'depois de confirmar, a pessoa faz login normalmente.',
    },
    '/send-verification-email': {
      summary: 'Reenviar código de confirmação de e-mail',
      description:
        'Gera um novo código de confirmação e o envia ao e-mail, substituindo o anterior. ' +
        'A resposta é a mesma para e-mail não cadastrado, já confirmado ou de conta excluída. ' +
        'Limite de 1 pedido a cada 10 minutos por IP: acima disso, 429 com o header X-Retry-After.',
    },
  };
  const authPaths = Object.fromEntries(
    Object.entries(authSchema.paths)
      .filter(([path]) => !hiddenAuthPaths.has(path))
      .map(([path, item]) => [
        `/auth${path}`,
        Object.fromEntries(
          Object.entries(item).map(([method, operation]) => [
            method,
            { ...operation, tags: ['Autenticação'], ...authOperationOverrides[path] },
          ]),
        ),
      ]),
  );
  const mergedDocument = {
    ...document,
    tags: [
      ...(document.tags ?? []),
      {
        name: 'Autenticação',
        description: 'Login, logout, sessão, recuperação de senha e confirmação de e-mail.',
      },
    ],
    paths: { ...document.paths, ...authPaths },
    components: {
      ...document.components,
      schemas: { ...document.components?.schemas, ...authSchema.components?.schemas },
      securitySchemes: {
        ...document.components?.securitySchemes,
        ...authSchema.components?.securitySchemes,
      },
    },
  } as OpenAPIObject;

  SwaggerModule.setup('openapi', app, mergedDocument, {
    jsonDocumentUrl: '/openapi.json',
    ui: false,
  });

  app.use(
    '/docs',
    apiReference({
      content: mergedDocument,
      pageTitle: 'Food Share API Docs',
      favicon: '/favicon.png',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Failed to start the application', error);
  process.exit(1);
});
