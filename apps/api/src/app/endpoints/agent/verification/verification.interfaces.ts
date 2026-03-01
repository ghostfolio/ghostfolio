import type {
  ToolCallRecord,
  VerificationConfidence,
  VerificationFactCheck,
  VerificationHallucination
} from '../agent-stream-event.interface';

// Re-export for convenience
export type {
  ToolCallRecord,
  VerificationConfidence,
  VerificationFactCheck,
  VerificationHallucination
};

// Query type classification based on tool call patterns
export type QueryType =
  | 'direct_data_retrieval'
  | 'multi_tool_synthesis'
  | 'comparative_analysis'
  | 'speculative'
  | 'unsupported';

// Input context for all verification stages
export interface VerificationContext {
  toolCalls: ToolCallRecord[];
  agentResponseText: string;
  userId: string;
  userCurrency: string;
  requestTimestamp: Date;
}

// Extracted number from response text
export interface ExtractedNumber {
  rawText: string;
  normalizedValue: number;
  isPercentage: boolean;
  isCurrency: boolean;
  position: number;
  surroundingContext: string;
}

// Truth set entry from tool results
export interface TruthSetEntry {
  value: number;
  path: string;
  toolName: string;
}

// Individual number verification status
export type NumberVerificationStatus = 'VERIFIED' | 'DERIVED' | 'UNVERIFIED';

export interface NumberVerificationDetail {
  extractedNumber: ExtractedNumber;
  status: NumberVerificationStatus;
  matchedTruthEntry?: TruthSetEntry;
  derivation?: string;
}

// Fact check result
export interface FactCheckResult {
  passed: boolean;
  verifiedCount: number;
  unverifiedCount: number;
  derivedCount: number;
  details: NumberVerificationDetail[];
}

// Claim grounding classification
export type ClaimGrounding =
  | 'GROUNDED'
  | 'PARTIALLY_GROUNDED'
  | 'UNGROUNDED'
  | 'EXEMPT';

export interface ClaimDetail {
  text: string;
  grounding: ClaimGrounding;
  reason: string;
}

// Hallucination detection result
export interface HallucinationResult {
  detected: boolean;
  rate: number;
  totalClaims: number;
  groundedClaims: number;
  ungroundedClaims: number;
  partiallyGroundedClaims: number;
  exemptClaims: number;
  flaggedClaims: string[];
  details: ClaimDetail[];
}

// Wire-format confidence level for SSE events
export type ConfidenceLevelWire = 'high' | 'medium' | 'low';

// Confidence scoring result
export interface ConfidenceResult {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
  breakdown: {
    dataScore: number;
    factScore: number;
    hallucinationScore: number;
    queryTypeModifier: number;
  };
  queryType: QueryType;
}

// Domain validation result
export interface DomainViolation {
  constraintId: string;
  description: string;
  expected: string;
  actual: string;
}

export interface DomainValidationResult {
  passed: boolean;
  violations: DomainViolation[];
}

// Output validation result
export interface OutputValidationIssue {
  checkId: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface OutputValidationCorrection {
  original: string;
  corrected: string;
  checkId: string;
}

export interface OutputValidationResult {
  passed: boolean;
  issues: OutputValidationIssue[];
  corrections?: OutputValidationCorrection[];
}

// Disclaimer injection result
export interface DisclaimerResult {
  disclaimerIds: string[];
  texts: string[];
  positions: ('prepend' | 'append')[];
}

// Base interface for extensible verification stages
// All checkers implement `run()` as the uniform dispatch method.
// Specific method names (check, detect, score, validate, inject) are preserved
// for type safety, but `run()` provides a consistent entry point for the pipeline.
export interface VerificationChecker {
  readonly stageName: string;
  run?(
    context: VerificationContext,
    signal?: AbortSignal,
    ...args: unknown[]
  ): unknown;
}

// Combined pipeline result
export interface VerificationPipelineResult {
  confidence: ConfidenceResult;
  factCheck: FactCheckResult;
  hallucination: HallucinationResult;
  domainValidation: DomainValidationResult;
  disclaimers: DisclaimerResult;
  outputValidation: OutputValidationResult;
  verificationDurationMs: number;
  dataFreshnessMs: number;
  timedOut: boolean;
}

// SSE event payloads
export interface ConfidenceEventPayload {
  score: number;
  level: ConfidenceLevelWire;
  reasoning: string;
  factCheck: {
    passed: boolean;
    verifiedCount: number;
    unverifiedCount: number;
    derivedCount: number;
  };
  hallucination: {
    detected: boolean;
    rate: number;
    flaggedClaims: string[];
  };
  dataFreshnessMs: number;
  verificationDurationMs: number;
}

export interface DisclaimerEventPayload {
  disclaimers: string[];
  domainViolations: string[];
}

export interface CorrectionEventPayload {
  message: string;
}
