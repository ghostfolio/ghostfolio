const DEFAULT_GLM_MODEL = 'glm-5';
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.5';
const DEFAULT_REQUEST_TIMEOUT_IN_MS = 15_000;

function extractTextFromResponsePayload(payload: unknown) {
  const firstChoice = (payload as { choices?: unknown[] })?.choices?.[0] as
    | { message?: { content?: unknown } }
    | undefined;
  const content = firstChoice?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const normalized = content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (
          typeof item === 'object' &&
          item !== null &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text;
        }

        return '';
      })
      .join(' ')
      .trim();

    return normalized.length > 0 ? normalized : null;
  }

  return null;
}

async function callChatCompletions({
  apiKey,
  model,
  prompt,
  url
}: {
  apiKey: string;
  model: string;
  prompt: string;
  url: string;
}) {
  const response = await fetch(url, {
    body: JSON.stringify({
      messages: [
        {
          content: 'You are a neutral financial assistant.',
          role: 'system'
        },
        {
          content: prompt,
          role: 'user'
        }
      ],
      model
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_IN_MS)
  });

  if (!response.ok) {
    throw new Error(`provider request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractTextFromResponsePayload(payload);

  if (!text) {
    throw new Error('provider returned no assistant text');
  }

  return {
    text
  };
}

export async function generateTextWithZAiGlm({
  apiKey,
  model,
  prompt
}: {
  apiKey: string;
  model?: string;
  prompt: string;
}) {
  return callChatCompletions({
    apiKey,
    model: model ?? DEFAULT_GLM_MODEL,
    prompt,
    url: 'https://api.z.ai/api/paas/v4/chat/completions'
  });
}

export async function generateTextWithMinimax({
  apiKey,
  model,
  prompt
}: {
  apiKey: string;
  model?: string;
  prompt: string;
}) {
  return callChatCompletions({
    apiKey,
    model: model ?? DEFAULT_MINIMAX_MODEL,
    prompt,
    url: 'https://api.minimax.io/v1/chat/completions'
  });
}
