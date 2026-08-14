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
      'API for the Food Share platform — connects establishments with surplus food ' +
        'to beneficiary entities.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const authSchema = await auth.api.generateOpenAPISchema();
  const authPaths = Object.fromEntries(
    Object.entries(authSchema.paths).map(([path, item]) => [`/api/auth${path}`, item]),
  );
  const mergedDocument = {
    ...document,
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

  app.use('/docs', apiReference({ content: mergedDocument }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Failed to start the application', error);
  process.exit(1);
});
