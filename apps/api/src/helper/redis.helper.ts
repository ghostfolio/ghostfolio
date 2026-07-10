import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

export function getRedisConnectionOptions(
  configurationService: ConfigurationService
) {
  return {
    db: configurationService.get('REDIS_DB'),
    host: configurationService.get('REDIS_HOST'),
    password: configurationService.get('REDIS_PASSWORD'),
    port: configurationService.get('REDIS_PORT')
  };
}
