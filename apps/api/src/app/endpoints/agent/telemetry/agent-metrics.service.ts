import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

export interface RecordQueryParams {
  userId: string;
  model: string;
  costUsd: number;
  durationMs: number;
  toolCount: number;
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class AgentMetricsService {
  private readonly logger = new Logger(AgentMetricsService.name);
  private readonly meter = metrics.getMeter('ghostfolio-agent');

  // Counters
  private readonly queryCounter = this.meter.createCounter(
    'agent.queries.total',
    { description: 'Total agent queries' }
  );

  private readonly toolCallCounter = this.meter.createCounter(
    'agent.tool_calls.total',
    { description: 'Total tool calls' }
  );

  private readonly feedbackCounter = this.meter.createCounter(
    'agent.feedback.total',
    { description: 'Total feedback submissions' }
  );

  private readonly errorCounter = this.meter.createCounter(
    'agent.errors.total',
    { description: 'Total agent errors' }
  );

  private readonly tokenCounter = this.meter.createCounter(
    'agent.tokens.total',
    { description: 'Total tokens consumed' }
  );

  // Histograms
  private readonly queryDurationHistogram = this.meter.createHistogram(
    'agent.query.duration_ms',
    { description: 'Agent query duration in milliseconds' }
  );

  private readonly costHistogram = this.meter.createHistogram(
    'agent.query.cost_usd',
    { description: 'Agent query cost in USD' }
  );

  private readonly toolCallDurationHistogram = this.meter.createHistogram(
    'agent.tool_call.duration_ms',
    { description: 'Tool call duration in milliseconds' }
  );

  // Observable gauges (updated externally)
  private currentEvalPassRate: Record<string, number> = {};
  private currentFeedbackScore = 0;

  public constructor() {
    this.meter
      .createObservableGauge('agent.eval.pass_rate', {
        description: 'Current eval pass rate'
      })
      .addCallback((result) => {
        for (const [suite, rate] of Object.entries(this.currentEvalPassRate)) {
          result.observe(rate, { 'eval.suite': suite });
        }
      });

    this.meter
      .createObservableGauge('agent.feedback.score', {
        description: 'Rolling feedback score'
      })
      .addCallback((result) => {
        result.observe(this.currentFeedbackScore);
      });
  }

  public recordQuery(params: RecordQueryParams): void {
    this.queryCounter.add(1, {
      'user.id': params.userId,
      'model.name': params.model
    });

    this.queryDurationHistogram.record(params.durationMs, {
      'model.name': params.model
    });

    this.costHistogram.record(params.costUsd, {
      'model.name': params.model
    });

    this.tokenCounter.add(params.inputTokens, {
      'token.type': 'input',
      'model.name': params.model
    });

    this.tokenCounter.add(params.outputTokens, {
      'token.type': 'output',
      'model.name': params.model
    });

    this.logger.debug('Recorded query metrics', {
      userId: params.userId,
      durationMs: params.durationMs,
      costUsd: params.costUsd
    });
  }

  public recordToolCall(
    toolName: string,
    durationMs: number,
    success: boolean
  ): void {
    this.toolCallCounter.add(1, {
      'tool.name': toolName,
      'tool.success': String(success)
    });

    this.toolCallDurationHistogram.record(durationMs, {
      'tool.name': toolName,
      'tool.success': String(success)
    });
  }

  public recordFeedback(rating: string): void {
    this.feedbackCounter.add(1, { 'feedback.rating': rating });
  }

  public recordError(category: string): void {
    this.errorCounter.add(1, { 'error.category': category });
  }

  public updateEvalPassRate(suite: string, rate: number): void {
    this.currentEvalPassRate[suite] = rate;
  }

  public updateFeedbackScore(score: number): void {
    this.currentFeedbackScore = score;
  }
}
