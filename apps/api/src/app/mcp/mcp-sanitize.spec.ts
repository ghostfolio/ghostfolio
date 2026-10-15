import {
  MCP_REDACTED,
  describeWebhookUrl,
  sanitizeForMcp,
  sanitizeResponseBody
} from './mcp-sanitize';

const DISCORD =
  'https://discord.com/api/webhooks/1234567890/SuperSecretToken_abc-DEF';

describe('sanitizeForMcp', () => {
  it('keeps only the host of a webhook URL', () => {
    expect(describeWebhookUrl(DISCORD)).toBe('discord.com/***');
    expect(describeWebhookUrl('https://example.com/hook/onlysecret')).toBe(
      'example.com/***'
    );
    expect(describeWebhookUrl('not a url')).toBe(MCP_REDACTED);
  });

  it('redacts webhookUrl wherever it is nested and keeps the other fields', () => {
    const result = sanitizeForMcp({
      plan: [{ emailEnabled: true, webhookEnabled: true, webhookUrl: DISCORD }],
      webhookUrl: null
    });

    expect(result).toEqual({
      plan: [
        {
          emailEnabled: true,
          webhookEnabled: true,
          webhookUrl: 'discord.com/***'
        }
      ],
      webhookUrl: null
    });
    expect(JSON.stringify(result)).not.toContain('SuperSecretToken');
  });

  it('redacts credential-like fields in any response', () => {
    expect(
      sanitizeForMcp({
        accessToken: 'abc',
        apiKey: 'k',
        nested: {
          SymbolProfile: { scraperConfiguration: { headers: { a: 'b' } } }
        },
        password: 'p',
        symbol: 'XEF.TO'
      })
    ).toEqual({
      accessToken: MCP_REDACTED,
      apiKey: MCP_REDACTED,
      nested: { SymbolProfile: { scraperConfiguration: MCP_REDACTED } },
      password: MCP_REDACTED,
      symbol: 'XEF.TO'
    });
  });

  it('leaves ordinary data and non-JSON bodies alone', () => {
    const data = { holdings: [{ symbol: 'XEF.TO', tokenCount: 3 }] };

    expect(JSON.parse(sanitizeResponseBody(JSON.stringify(data)))).toEqual(
      data
    );
    expect(sanitizeResponseBody('plain text')).toBe('plain text');
  });
});
