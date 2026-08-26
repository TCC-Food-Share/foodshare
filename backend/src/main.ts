import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import express from 'express';

import { AppModule } from './app.module';
import { auth } from './auth/auth.instance';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json());
  app.useGlobalPipes(
    new ValidationPipe({
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
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const authSchema = await auth.api.generateOpenAPISchema();
  const hiddenAuthPaths = new Set(['/ok', '/error']);
  const authOperationOverrides: Record<string, { summary: string; description: string }> = {
    '/sign-in/email': {
      summary: 'Login',
      description: 'Autentica com e-mail e senha e, em caso de sucesso, emite uma sessão (cookie).',
    },
    '/sign-out': {
      summary: 'Logout',
      description: 'Encerra a sessão atual, invalidando o cookie de sessão.',
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
      { name: 'Autenticação', description: 'Login, logout e sessão.' },
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

  app.use('/docs', apiReference({ content: mergedDocument, pageTitle: 'Food Share API Docs' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Failed to start the application', error);
  process.exit(1);
});
