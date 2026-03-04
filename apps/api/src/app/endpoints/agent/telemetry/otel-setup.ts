import { Logger } from '@nestjs/common';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

const logger = new Logger('OTelSetup');

const TELEMETRY_ENABLED =
  process.env.CLAUDE_CODE_ENABLE_TELEMETRY === 'true' &&
  !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (TELEMETRY_ENABLED) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const authHeader = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  const headers: Record<string, string> = {};

  if (authHeader) {
    for (const pair of authHeader.split(',')) {
      const [key, ...rest] = pair.split('=');
      if (key && rest.length > 0) {
        headers[key.trim()] = rest.join('=').trim();
      }
    }
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ghostfolio-agent',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0'
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers
  });
  const metricExporter = new OTLPMetricExporter({
    url: `${endpoint}/v1/metrics`,
    headers
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000
    })
  });

  try {
    sdk.start();
    logger.log('OpenTelemetry SDK initialized');
  } catch (error) {
    logger.error('OpenTelemetry SDK failed to start', error);
  }

  const shutdown = async () => {
    try {
      await sdk.shutdown();
      logger.log('OpenTelemetry SDK shut down');
    } catch (error) {
      logger.error('OpenTelemetry SDK shutdown error', error);
    }
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
} else {
  logger.log(
    'OpenTelemetry disabled (set CLAUDE_CODE_ENABLE_TELEMETRY=true and OTEL_EXPORTER_OTLP_ENDPOINT)'
  );
}
