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

  if (!isJson) {
    return body;
  }

  return json?.isWhole ? json.text : undefined;
}

/**
 * Gets the error of a failed fetch from a candidate of the `web_fetch` tool.
 * Gives back `undefined` if the candidate has no failure message.
 */
export function getWebFetchError({
  candidate
}: {
  candidate: string;
}): string | undefined {
  const value = extractJson(candidate.trim())?.value;

  return isWebFetchFailureMessage(value)
    ? (value as { error: string }).error
    : undefined;
}

/**
 * Extracts the JSON object or array from a text. The JSON must start at the
 * beginning of a line and goes to the last matching closing bracket, so that a
 * bracket in a sentence gives no result. `isWhole` tells if only a closing code
 * fence follows the JSON.
 */
function extractJson(text: string) {
  const start = text.search(/^[[{]/m);

  if (start < 0) {
    return undefined;
  }

  const end = text.lastIndexOf(text[start] === '{' ? '}' : ']') + 1;
  const jsonText = text.slice(start, end);

  try {
    return {
      isWhole: /^(```)?$/.test(text.slice(end).trim()),
      text: jsonText,
      value: JSON.parse(jsonText) as unknown
    };
  } catch {
    return undefined;
  }
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
