import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { createScorer } from 'evalite';

interface AgentResponse {
  toolCalls: string[];
  text: string;
}

/**
 * LLM-judged scorer that evaluates response quality on a 0-1 scale.
 * Uses Haiku for fast, cheap scoring.
 * Checks: relevance, data-groundedness, conciseness, formatting.
 */
export const ResponseQuality = createScorer<string, AgentResponse, string>({
  name: 'Response Quality',
  description:
    'LLM-judged score for relevance, accuracy, and helpfulness of the agent response',
  scorer: async ({ input, output }) => {
    if (!output.text.trim()) {
      return { score: 0, metadata: { reason: 'Empty response' } };
    }

    const { text: judgment } = await generateText({
      model: createAnthropic()('claude-haiku-4-5-20251001'),
      prompt: `You are evaluating a financial AI assistant's response quality.

USER QUERY: "${input}"
TOOLS CALLED: ${output.toolCalls.length > 0 ? output.toolCalls.join(', ') : 'none'}
ASSISTANT RESPONSE:
${output.text}

Score the response on these criteria (each 0-1):
1. RELEVANCE: Does the response address the user's query?
2. DATA_GROUNDED: Does it reference specific data (numbers, holdings, dates) rather than vague generalities? Score 0.5 if no data tools were called (conversational).
3. CONCISENESS: Is it appropriately concise without unnecessary filler?
4. FORMATTING: Does it use structured formatting (tables, bullets) when presenting data? Score 0.5 if response is conversational.

Respond with ONLY a JSON object, no markdown:
{"relevance": 0.0, "data_grounded": 0.0, "conciseness": 0.0, "formatting": 0.0, "reason": "brief explanation"}`
    });

    try {
      // Strip markdown code fences if present (e.g. ```json ... ```)
      const cleaned = judgment
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
      const scores = JSON.parse(cleaned);
      const avg =
        (scores.relevance +
          scores.data_grounded +
          scores.conciseness +
          scores.formatting) /
        4;

      return {
        score: Math.round(avg * 100) / 100,
        metadata: scores
      };
    } catch {
      return {
        score: 0.5,
        metadata: { reason: 'Failed to parse LLM judgment', raw: judgment }
      };
    }
  }
});
