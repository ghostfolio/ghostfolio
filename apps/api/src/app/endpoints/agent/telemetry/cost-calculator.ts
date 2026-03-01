const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  'claude-sonnet-4-6': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-opus-4-6': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-haiku-4-5': { inputPer1M: 0.8, outputPer1M: 4.0 }
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  sdkCostUsd?: number
): number {
  if (sdkCostUsd !== undefined && sdkCostUsd > 0) {
    return sdkCostUsd;
  }

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 0;
  }

  return (
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M
  );
}
