import type { HallucinationCheckResult } from './hallucination-check';
import type { OutputValidationResult } from './output-validation';

export interface ConfidenceScoreResult {
  score: number;
  breakdown: {
    toolSuccessRate: number;
    stepEfficiency: number;
    outputValidity: number;
    hallucinationScore: number;
  };
}

const WEIGHTS = {
  toolSuccessRate: 0.3,
  stepEfficiency: 0.1,
  outputValidity: 0.3,
  hallucinationScore: 0.3
};

/**
 * Composite confidence score (0-1) for an agent response.
 */
export function computeConfidence({
  toolCallCount,
  toolErrorCount,
  stepCount,
  maxSteps,
  validation,
  hallucination
}: {
  toolCallCount: number;
  toolErrorCount: number;
  stepCount: number;
  maxSteps: number;
  validation: OutputValidationResult;
  hallucination: HallucinationCheckResult;
}): ConfidenceScoreResult {
  // Tool success rate: 1.0 if no tools, else (successful / total)
  const toolSuccessRate =
    toolCallCount === 0 ? 1 : (toolCallCount - toolErrorCount) / toolCallCount;

  // Step efficiency: penalize using many steps (closer to max = lower)
  const stepEfficiency = maxSteps > 0 ? 1 - stepCount / (maxSteps * 2) : 1;
  const clampedEfficiency = Math.max(0, Math.min(1, stepEfficiency));

  const score =
    WEIGHTS.toolSuccessRate * toolSuccessRate +
    WEIGHTS.stepEfficiency * clampedEfficiency +
    WEIGHTS.outputValidity * validation.score +
    WEIGHTS.hallucinationScore * hallucination.score;

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      toolSuccessRate: Math.round(toolSuccessRate * 1000) / 1000,
      stepEfficiency: Math.round(clampedEfficiency * 1000) / 1000,
      outputValidity: Math.round(validation.score * 1000) / 1000,
      hallucinationScore: Math.round(hallucination.score * 1000) / 1000
    }
  };
}
