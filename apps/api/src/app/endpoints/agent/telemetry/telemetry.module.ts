import { Module } from '@nestjs/common';

import { AgentMetricsService } from './agent-metrics.service';
import { AgentTracerService } from './agent-tracer.service';
import { LangfuseFeedbackService } from './langfuse-feedback.service';
import { TelemetryHealthService } from './telemetry-health.service';

@Module({
  providers: [
    AgentMetricsService,
    AgentTracerService,
    LangfuseFeedbackService,
    TelemetryHealthService
  ],
  exports: [AgentMetricsService, AgentTracerService, LangfuseFeedbackService]
})
export class TelemetryModule {}
