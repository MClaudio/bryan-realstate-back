import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const rawPort = process.env.PORT ?? '3000';
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    logger.error(
      `Puerto inválido en PORT='${rawPort}'. Usa un número entre 1 y 65535.`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  try {
    await app.listen(port);
    const url = await app.getUrl();
    logger.log(`Nest application successfully started on ${url}`);
  } catch (error: any) {
    const code: string | undefined = error?.code;
    if (code === 'EADDRINUSE') {
      logger.error(
        `No se pudo arrancar el backend: el puerto ${port} ya está en uso (EADDRINUSE). ` +
          `Cierra el proceso que lo ocupa o cambia el valor de PORT en tu .env.`,
      );
    } else {
      logger.error(
        `No se pudo arrancar el backend: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    process.exit(1);
  }
}
bootstrap();
