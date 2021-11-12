import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  const port = process.env.PORT || 3333;
  await app.listen(port, () => {
    logLogo();
    Logger.log(`Listening at http://localhost:${port}`, '', false);
    Logger.log('', '', false);
  });
}

function logLogo() {
  Logger.log('   ________               __  ____      ___', '', false);
  Logger.log('  / ____/ /_  ____  _____/ /_/ __/___  / (_)___', '', false);
  Logger.log(' / / __/ __ \\/ __ \\/ ___/ __/ /_/ __ \\/ / / __ \\', '', false);
  Logger.log('/ /_/ / / / / /_/ (__  ) /_/ __/ /_/ / / / /_/ /', '', false);
  Logger.log(
    `\\____/_/ /_/\\____/____/\\__/_/  \\____/_/_/\\____/ ${environment.version}`,
    '',
    false
  );
  Logger.log('', '', false);
}

bootstrap();
