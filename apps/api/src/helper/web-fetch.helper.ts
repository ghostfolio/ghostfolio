/**
 * Gets the response body from a candidate of the `web_fetch` tool. The model
 * retypes the body, so that JSON can have code fences or text around it. Gives
 * back `undefined` if the candidate has no usable body.
 */
export function getWebFetchBody({
  candidate,
  isJson
}: {
  candidate: string;
  isJson: boolean;
}): string | undefined {
  const body = candidate.trim();

  if (!body) {
    return undefined;
  }

  const json = extractJson(body);

  if (isWebFetchFailureMessage(json?.value)) {
    return undefined;
  }

  return isJson ? json?.text : body;
}

/**
 * Extracts the JSON object or array from a text. The extraction goes from the
 * first opening bracket to the last closing bracket, so that a text with other
 * brackets around the JSON gives no result.
 */
function extractJson(text: string) {
  const brackets = [
    { close: '}', start: text.indexOf('{') },
    { close: ']', start: text.indexOf('[') }
  ]
    .filter(({ start }) => {
      return start >= 0;
    })
    .sort((a, b) => {
      return a.start - b.start;
    });

  for (const { close, start } of brackets) {
    const jsonText = text.slice(start, text.lastIndexOf(close) + 1);

    try {
      return { text: jsonText, value: JSON.parse(jsonText) as unknown };
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Checks for the result of a failed fetch, which the model can give back as if
 * it was the response body:
 * { "url": "…", "status": "failed", "error": "HTTP 405: Method Not Allowed" }
 */
function isWebFetchFailureMessage(value: unknown) {
  const { error, status, url } = (value ?? {}) as Record<string, unknown>;

  return (
    status === 'failed' && typeof error === 'string' && typeof url === 'string'
  );
}
