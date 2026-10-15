/**
 * Everything a tool returns ends up in the context of the connected model, so
 * secrets must not leave through MCP even where the REST API (and with it the
 * web client, which has to show and edit them) returns them as they are.
 */

export const MCP_REDACTED = '[redacted]';

// Compared case-insensitively with everything but letters and digits removed
const SECRET_KEYS = new Set([
  'accesstoken',
  'apikey',
  'hashedaccesstoken',
  'hashedkey',
  'password',
  'scraperconfiguration', // may carry headers or cookies of a scraped site
  'secret',
  'token'
]);

const WEBHOOK_URL_KEY = 'webhookurl';

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * A webhook URL embeds its secret in the path (Discord: `/api/webhooks/<id>/
 * <token>`) or in the query. The model only needs to know that one is set and
 * where it points, so only the host survives.
 */
export function describeWebhookUrl(webhookUrl: string) {
  try {
    return `${new URL(webhookUrl).hostname}/***`;
  } catch {
    return MCP_REDACTED;
  }
}

export function sanitizeForMcp(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForMcp(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const normalizedKey = normalizeKey(key);

        if (normalizedKey === WEBHOOK_URL_KEY) {
          return [
            key,
            typeof item === 'string' && item ? describeWebhookUrl(item) : item
          ];
        }

        if (SECRET_KEYS.has(normalizedKey) && item !== null && item !== '') {
          return [key, MCP_REDACTED];
        }

        return [key, sanitizeForMcp(item)];
      })
    );
  }

  return value;
}

/** Sanitizes a JSON response body. A body that is not JSON is passed on as is. */
export function sanitizeResponseBody(body: string) {
  try {
    return JSON.stringify(sanitizeForMcp(JSON.parse(body)));
  } catch {
    return body;
  }
}
