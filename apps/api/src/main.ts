import { languageRedirectMiddleware } from '@ghostfolio/api/middlewares/language-redirect.middleware';
import { createMcpAuthorizationMiddleware } from '@ghostfolio/api/middlewares/mcp-authorization.middleware';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import {
  BULL_BOARD_ROUTE,
  DEFAULT_HOST,
  DEFAULT_PORT,
  MCP_ENDPOINT,
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
import { MCP_STRATEGY, McpStrategy } from '@rekog/mcp-nest';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

const logger = new Logger('Bootstrap');
const processWarningLogger = new Logger('ProcessWarning');

process.on('warning', ({ name, stack }) => {
  if (name === 'MaxListenersExceededWarning') {
    // Log the stack trace of MaxListenersExceededWarning occurrences to identify
    // the event emitter and the call site which registers the listeners
    processWarningLogger.warn(stack);
  }
});

async function bootstrap() {
  // Respect HTTP_PROXY / HTTPS_PROXY / NO_PROXY for outbound HTTP requests
  setGlobalDispatcher(new EnvHttpProxyAgent());

  const configApp = await NestFactory.create(AppModule);
  const configService = configApp.get<ConfigService>(ConfigService);
  let customLogLevels: LogLevel[];

  try {
    customLogLevels = JSON.parse(
      configService.get<string>('LOG_LEVELS')
    ) as LogLevel[];
  } catch {}

  await configApp.close();

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
      `${BULL_BOARD_ROUTE.substring(1)}{/*wildcard}`,
      'sitemap.xml',
      ...SUPPORTED_LANGUAGE_CODES.map((languageCode) => {
        // Exclude language-specific routes with an optional wildcard
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

  app.use(cookieParser());

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

  app.use(languageRedirectMiddleware);

  const configurationService = app.get(ConfigurationService);

  const trustProxy = configurationService.get('TRUST_PROXY');

  if (trustProxy) {
    app.set('trust proxy', trustProxy);
  }

  if (
    configurationService.get('ENABLE_FEATURE_RATE_LIMITING') &&
    trustProxy === ''
  ) {
    logger.warn(
      'Rate limiting is enabled, but TRUST_PROXY is not set. If the Ghostfolio application runs behind a reverse proxy, the rate limits are shared across all clients.'
    );
  }

  const HOST = configService.get<string>('HOST') || DEFAULT_HOST;
  const PORT = configService.get<number>('PORT') || DEFAULT_PORT;

  if (configurationService.get('ENABLE_FEATURE_MCP')) {
    const rootUrl = configurationService.get('ROOT_URL');

    if (rootUrl === environment.rootUrl) {
      const { hostname } = new URL(rootUrl);

      logger.warn(
        `The Model Context Protocol (MCP) is enabled, but ROOT_URL is not set. A client which calls the endpoint from a browser page is accepted only with the origin ${hostname}.`
      );
    }

    // The middleware has to be registered before the transport mounts its
    // route, so that an unauthorized request gets the status 401 of the
    // specification instead of an error of the protocol
    app.use(
      MCP_ENDPOINT,
      createMcpAuthorizationMiddleware(app.get(ImpersonationService))
    );

    const mcpStrategy = app.get<McpStrategy>(MCP_STRATEGY);

    // The transports of the model context protocol have to be mounted before
    // the server accepts connections
    mcpStrategy.setHttpAdapter(app.getHttpAdapter());

    // The configuration of the application is inherited, so that the global
    // filters and pipes also apply to a tool of the model context protocol.
    // The ImpersonationWriteGuard does not protect such a tool, because it
    // keys on the Impersonation-Id header, which a client of the protocol
    // never sends. A tool which changes data has to be guarded on its own.
    app.connectMicroservice(
      { strategy: mcpStrategy },
      { inheritAppConfig: true }
    );

    await app.startAllMicroservices();
  }

  await app.listen(PORT, HOST, () => {
    logLogo();

    let address = app.getHttpServer().address();

    if (typeof address === 'object') {
      const addressObject = address;
      let host = addressObject.address;

      if (addressObject.family === 'IPv6') {
        host = `[${addressObject.address}]`;
      }

      address = `${host}:${addressObject.port}`;
    }

    logger.log(`Listening at http://${address}`);
    logger.log('');
  });
}

function logLogo() {
  logger.log('   ________               __  ____      ___');
  logger.log('  / ____/ /_  ____  _____/ /_/ __/___  / (_)___');
  logger.log(' / / __/ __ \\/ __ \\/ ___/ __/ /_/ __ \\/ / / __ \\');
  logger.log('/ /_/ / / / / /_/ (__  ) /_/ __/ /_/ / / / /_/ /');
  logger.log(
    `\\____/_/ /_/\\____/____/\\__/_/  \\____/_/_/\\____/ ${environment.version}`
  );
  logger.log('');
}

bootstrap();
