export { VerificationModule } from './verification.module';
export { VerificationService } from './verification.service';
export { FactChecker } from './fact-checker';
export { HallucinationDetector } from './hallucination-detector';
export { ConfidenceScorer } from './confidence-scorer';
export { DomainValidator } from './domain-validator';
export { OutputValidator } from './output-validator';
export { DisclaimerInjector } from './disclaimer-injector';
export { classifyQueryType } from './confidence-scorer';
export type {
  ClaimDetail,
  ConfidenceEventPayload,
  ConfidenceLevelWire,
  ConfidenceResult,
  CorrectionEventPayload,
  DisclaimerEventPayload,
  DisclaimerResult,
  DomainValidationResult,
  DomainViolation,
  ExtractedNumber,
  FactCheckResult,
  HallucinationResult,
  NumberVerificationDetail,
  NumberVerificationStatus,
  OutputValidationCorrection,
  OutputValidationIssue,
  OutputValidationResult,
  QueryType,
  ToolCallRecord,
  TruthSetEntry,
  VerificationChecker,
  VerificationContext,
  VerificationPipelineResult
} from './verification.interfaces';
