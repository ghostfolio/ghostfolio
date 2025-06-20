import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  STORYBOOK_PATH,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';

import {
  Logger,
  LogLevel,
  ValidationPipe,
  VersioningType
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function bootstrap() {
  const configApp = await NestFactory.create(AppModule);
  const configService = configApp.get<ConfigService>(ConfigService);
  let customLogLevels: LogLevel[];

  try {
    customLogLevels = JSON.parse(
      configService.get<string>('LOG_LEVELS')
    ) as LogLevel[];
  } catch {}

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      customLogLevels ??
      (environment.production
        ? ['error', 'log', 'warn']
        : ['debug', 'error', 'log', 'verbose', 'warn'])
  });

  app.enableCors();
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI
  });
  app.setGlobalPrefix('api', {
    exclude: [
      'sitemap.xml',
      ...SUPPORTED_LANGUAGE_CODES.map((languageCode) => {
        return `/${languageCode}{/*wildcard}`;
      })
    ]
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  // Support 10mb csv/json files for importing activities
  app.useBodyParser('json', { limit: '10mb' });

  if (configService.get<string>('ENABLE_FEATURE_SUBSCRIPTION') === 'true') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith(STORYBOOK_PATH)) {
        next();
      } else {
        helmet({
          contentSecurityPolicy: {
            directives: {
              connectSrc: ["'self'", 'https://js.stripe.com'], // Allow connections to Stripe
              frameSrc: ["'self'", 'https://js.stripe.com'], // Allow loading frames from Stripe
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'], // Allow inline scripts and scripts from Stripe
              scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Allow inline event handlers
              styleSrc: ["'self'", "'unsafe-inline'"] // Allow inline styles
            }
          },
          crossOriginOpenerPolicy: false // Disable Cross-Origin-Opener-Policy header (for Internet Identity)
        })(req, res, next);
      }
    });
  }

  const HOST = configService.get<string>('HOST') || DEFAULT_HOST;
  const PORT = configService.get<number>('PORT') || DEFAULT_PORT;

  await app.listen(PORT, HOST, () => {
    logLogo();
    Logger.log(`Listening at http://${HOST}:${PORT}`);
    Logger.log('');
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
