import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
      'API da plataforma Food Share — conecta estabelecimentos com excedentes ' +
        'alimentares a entidades beneficiárias.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Expõe apenas o JSON do OpenAPI (sem a UI padrão do swagger-ui).
  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: '/openapi.json',
    ui: false,
  });

  // UI da documentação via Scalar, lendo o documento gerado acima.
  app.use('/docs', apiReference({ content: document }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Failed to start the application', error);
  process.exit(1);
});
