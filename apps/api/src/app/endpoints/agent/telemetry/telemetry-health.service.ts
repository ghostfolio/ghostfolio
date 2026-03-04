import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class TelemetryHealthService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryHealthService.name);

  public onModuleInit() {
    const telemetryEnabled =
      process.env.CLAUDE_CODE_ENABLE_TELEMETRY === 'true';
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (telemetryEnabled && endpoint) {
      this.logger.log(`Telemetry active, exporting to ${endpoint}`);
    } else if (telemetryEnabled && !endpoint) {
      this.logger.warn(
        'CLAUDE_CODE_ENABLE_TELEMETRY is true but OTEL_EXPORTER_OTLP_ENDPOINT is not set'
      );
    } else {
      this.logger.log('Telemetry disabled');
    }
  }
}
