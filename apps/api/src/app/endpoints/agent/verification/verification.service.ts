import { Injectable, Logger } from '@nestjs/common';

import { ConfidenceScorer } from './confidence-scorer';
import { DisclaimerInjector } from './disclaimer-injector';
import { DomainValidator } from './domain-validator';
import { FactChecker } from './fact-checker';
import { HallucinationDetector } from './hallucination-detector';
import { OutputValidator } from './output-validator';
import type {
  VerificationContext,
  VerificationPipelineResult
} from './verification.interfaces';

const VERIFICATION_TIMEOUT_MS = 500;

const DEFAULT_RESULT: VerificationPipelineResult = {
  confidence: {
    score: 0.5,
    level: 'MEDIUM',
    reasoning: 'Verification timed out',
    breakdown: {
      dataScore: 0,
      factScore: 0,
      hallucinationScore: 0,
      queryTypeModifier: 1
    },
    queryType: 'direct_data_retrieval'
  },
  factCheck: {
    passed: true,
    verifiedCount: 0,
    unverifiedCount: 0,
    derivedCount: 0,
    details: []
  },
  hallucination: {
    detected: false,
    rate: 0,
    totalClaims: 0,
    groundedClaims: 0,
    ungroundedClaims: 0,
    partiallyGroundedClaims: 0,
    exemptClaims: 0,
    flaggedClaims: [],
    details: []
  },
  domainValidation: { passed: true, violations: [] },
  disclaimers: { disclaimerIds: [], texts: [], positions: [] },
  outputValidation: { passed: true, issues: [] },
  verificationDurationMs: 500,
  dataFreshnessMs: 0,
  timedOut: true
};

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  public constructor(
    private readonly factChecker: FactChecker,
    private readonly hallucinationDetector: HallucinationDetector,
    private readonly confidenceScorer: ConfidenceScorer,
    private readonly domainValidator: DomainValidator,
    private readonly outputValidator: OutputValidator,
    private readonly disclaimerInjector: DisclaimerInjector
  ) {}

  public async verify(
    context: VerificationContext
  ): Promise<VerificationPipelineResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    const { signal } = abortController;

    const pipeline = async (): Promise<VerificationPipelineResult> => {
      // Phase A: Run independent stages in parallel
      const [factCheck, hallucination, domainValidation, outputValidation] =
        await Promise.all([
          this.runStage(
            'factChecker',
            () => this.factChecker.check(context, signal),
            DEFAULT_RESULT.factCheck
          ),
          this.runStage(
            'hallucinationDetector',
            () => this.hallucinationDetector.detect(context, signal),
            DEFAULT_RESULT.hallucination
          ),
          this.runStage(
            'domainValidator',
            () => this.domainValidator.validate(context),
            DEFAULT_RESULT.domainValidation
          ),
          this.runStage(
            'outputValidator',
            () => this.outputValidator.validate(context),
            DEFAULT_RESULT.outputValidation
          )
        ]);

      if (signal.aborted) {
        return {
          ...DEFAULT_RESULT,
          verificationDurationMs: Date.now() - startTime
        };
      }

      // Phase B: Sequential stages that depend on Phase A results
      const confidence = await this.runStage(
        'confidenceScorer',
        () => this.confidenceScorer.score(context, factCheck, hallucination),
        DEFAULT_RESULT.confidence
      );

      const disclaimers = await this.runStage(
        'disclaimerInjector',
        () => this.disclaimerInjector.inject(context),
        DEFAULT_RESULT.disclaimers
      );

      // Compute data freshness
      const dataFreshnessMs = this.computeDataFreshness(context);

      const verificationDurationMs = Date.now() - startTime;

      // Emit structured verification logs
      this.logger.verbose(
        `[agent.verification.fact_check] passed=${factCheck.passed} verified=${factCheck.verifiedCount} unverified=${factCheck.unverifiedCount} derived=${factCheck.derivedCount}`
      );
      this.logger.verbose(
        `[agent.verification.hallucination] detected=${hallucination.detected} rate=${hallucination.rate} ungrounded=${hallucination.ungroundedClaims}`
      );
      this.logger.verbose(
        `[agent.verification.confidence] score=${confidence.score} level=${confidence.level} queryType=${confidence.queryType}`
      );
      if (domainValidation.violations.length > 0) {
        this.logger.verbose(
          `[agent.verification.domain_violation] count=${domainValidation.violations.length} ids=${domainValidation.violations.map((v) => v.constraintId).join(',')}`
        );
      }
      if (disclaimers.disclaimerIds.length > 0) {
        this.logger.verbose(
          `[agent.verification.disclaimer] ids=${disclaimers.disclaimerIds.join(',')}`
        );
      }
      this.logger.verbose(
        `[agent.verification.pipeline_duration] durationMs=${verificationDurationMs} timedOut=false`
      );

      return {
        confidence,
        factCheck,
        hallucination,
        domainValidation,
        disclaimers,
        outputValidation,
        verificationDurationMs,
        dataFreshnessMs,
        timedOut: false
      };
    };

    const timeout = new Promise<VerificationPipelineResult>((resolve) => {
      setTimeout(() => {
        abortController.abort();
        resolve({
          ...DEFAULT_RESULT,
          verificationDurationMs: VERIFICATION_TIMEOUT_MS
        });
      }, VERIFICATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([pipeline(), timeout]);
    } catch (error) {
      this.logger.error(
        `Verification pipeline failed: ${error?.message ?? error}`,
        error?.stack
      );
      return {
        ...DEFAULT_RESULT,
        confidence: {
          ...DEFAULT_RESULT.confidence,
          level: 'LOW',
          reasoning: 'Verification could not be completed for this response.'
        },
        verificationDurationMs: Date.now() - startTime,
        timedOut: false
      };
    }
  }

  private async runStage<T>(
    name: string,
    fn: () => T,
    defaultValue: Awaited<T>
  ): Promise<Awaited<T>> {
    const stageStart = Date.now();

    try {
      const result = await fn();

      this.logger.verbose(
        `Verification stage "${name}" completed in ${Date.now() - stageStart}ms`
      );

      return result;
    } catch (error) {
      this.logger.warn(
        `Verification stage "${name}" failed after ${Date.now() - stageStart}ms: ${error?.message ?? error}`
      );

      return defaultValue;
    }
  }

  private computeDataFreshness(context: VerificationContext): number {
    if (context.toolCalls.length === 0) return 0;

    let oldest = Infinity;
    for (const call of context.toolCalls) {
      const callTime =
        call.timestamp instanceof Date
          ? call.timestamp.getTime()
          : new Date(call.timestamp).getTime();
      if (callTime < oldest) oldest = callTime;
    }

    if (oldest === Infinity) return 0;

    const requestTime =
      context.requestTimestamp instanceof Date
        ? context.requestTimestamp.getTime()
        : new Date(context.requestTimestamp).getTime();

    return Math.max(0, requestTime - oldest);
  }
}
