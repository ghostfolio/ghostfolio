export const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', tier: 'Fast' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', tier: 'Balanced' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6', tier: 'Best' }
] as const;

export type AnthropicModelId = (typeof ANTHROPIC_MODELS)[number]['id'];

export const DEFAULT_MODEL_ID: AnthropicModelId = 'claude-sonnet-4-6';

const VALID_IDS = new Set<string>(ANTHROPIC_MODELS.map((m) => m.id));

export function validateModelId(id?: string): AnthropicModelId {
  if (id && VALID_IDS.has(id)) {
    return id as AnthropicModelId;
  }

  return DEFAULT_MODEL_ID;
}
