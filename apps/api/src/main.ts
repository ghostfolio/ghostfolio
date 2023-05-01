import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function bootstrap() {
  const configApp = await NestFactory.create(AppModule);
  const configService = configApp.get<ConfigService>(ConfigService);

  const app = await NestFactory.create(AppModule, {
    logger: environment.production
      ? ['error', 'log', 'warn']
      : ['debug', 'error', 'log', 'verbose', 'warn']
  });
  app.enableCors();
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  // Support 10mb csv/json files for importing activities
  app.use(bodyParser.json({ limit: '10mb' }));

  const BASE_CURRENCY = configService.get<string>('BASE_CURRENCY');
  const HOST = configService.get<string>('HOST') || '0.0.0.0';
  const PORT = configService.get<number>('PORT') || 3333;

  await app.listen(PORT, HOST, () => {
    logLogo();
    Logger.log(`Listening at http://${HOST}:${PORT}`);
    Logger.log('');

    if (BASE_CURRENCY) {
      Logger.warn(
        `The environment variable "BASE_CURRENCY" is deprecated and will be removed in Ghostfolio 2.0.`
      );
      Logger.warn(
        'Please use the currency converter in the activity dialog instead.'
      );
    }
  });
}

function logLogo() {
  Logger.log('   ________               __  ____      ___');
  Logger.log('  / ____/ /_  ____  _____/ /_/ __/___  / (_)___');
  Logger.log(' / / __/ __ \\/ __ \\/ ___/ __/ /_/ __ \\/ / / __ \\');
  Logger.log('/ /_/ / / / / /_/ (__  ) /_/ __/ /_/ / / / /_/ /');
  Logger.log(
    `\\____/_/ /_/\\____/____/\\__/_/  \\____/_/_/\\____/ ${environment.version}`
  );
  Logger.log('');
}

bootstrap();
