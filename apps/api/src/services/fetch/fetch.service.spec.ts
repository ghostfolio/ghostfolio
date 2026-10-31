import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_ENGINE_WEB_FETCH,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_WEB_FETCH,
  PROPERTY_WEB_FETCH_ROUTES
} from '@ghostfolio/common/config';

import { Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { FetchService } from './fetch.service';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});
jest.mock('ai', () => {
  return {
    generateText: jest.fn(),
    jsonSchema: jest.fn(),
    tool: jest.fn((options) => {
      return options;
    })
  };
});

const BODY = '{"items":[{"id":1,"name":"Example"}],"total":1}';

const FAILURE_MESSAGE =
  '{"url":"https://www.example.com/data.json","status":"failed","error":"HTTP 405: Method Not Allowed","http_status":405}';

const URL_WITH_ROUTE = 'https://www.example.com/data.json';

describe('FetchService', () => {
  let directFetch: jest.SpyInstance;
  let fetchService: FetchService;
  let properties: Record<string, unknown>;

  const mockGenerateText = (result: {
    finishReason?: string;
    sources?: unknown[];
    text?: string;
  }) => {
    (generateText as jest.Mock).mockResolvedValue({
      finishReason: 'stop',
      sources: [],
      text: '',
      ...result
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (createOpenRouter as jest.Mock).mockReturnValue({
      chat: jest.fn((model: string) => {
        return model;
      })
    });

    directFetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('direct'));

    properties = {
      [PROPERTY_API_KEY_OPENROUTER]: 'api-key',
      [PROPERTY_OPENROUTER_ENGINE_WEB_FETCH]: 'parallel',
      [PROPERTY_OPENROUTER_MODEL_WEB_FETCH]: 'model',
      [PROPERTY_WEB_FETCH_ROUTES]: [
        {
          domain: 'example.com',
          responseContentType: 'application/json'
        },
        { domain: 'example.org' }
      ]
    };

    fetchService = new FetchService({
      getByKey: jest.fn((key: string) => {
        return Promise.resolve(properties[key]);
      })
    } as unknown as PropertyService);

    await fetchService.onModuleInit();
  });

  afterEach(() => {
    directFetch.mockRestore();
  });

  it('should get the body from the text of the model', async () => {
    mockGenerateText({ text: `\`\`\`json\n${BODY}\n\`\`\`` });

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe(BODY);

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('should get the body from the content of a source first', async () => {
    mockGenerateText({
      sources: [{ providerMetadata: { openrouter: { content: BODY } } }],
      text: '{"text":true}'
    });

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe(BODY);
  });

  it('should use the text of the model after a source with a failure message', async () => {
    mockGenerateText({
      sources: [
        { providerMetadata: { openrouter: { content: FAILURE_MESSAGE } } }
      ],
      text: BODY
    });

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe(BODY);
  });

  it('should get the body from the content of a source on a truncated text', async () => {
    mockGenerateText({
      finishReason: 'length',
      sources: [{ providerMetadata: { openrouter: { content: BODY } } }],
      text: '{"items":['
    });

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe(BODY);

    expect(directFetch).not.toHaveBeenCalled();
  });

  it('should log the failure message of a source after an empty text', async () => {
    const debug = jest.spyOn(Logger.prototype, 'debug');

    mockGenerateText({
      sources: [
        { providerMetadata: { openrouter: { content: FAILURE_MESSAGE } } }
      ],
      text: ''
    });

    await fetchService.fetch(URL_WITH_ROUTE);

    expect(debug.mock.calls.join()).toContain('HTTP 405');

    debug.mockRestore();
  });

  it('should redact the API keys in the log of a rejected body', async () => {
    const debug = jest.spyOn(Logger.prototype, 'debug');

    mockGenerateText({
      text: '{"url":"https://www.example.com/data.json?apikey=secret&api_token=secret","status":"failed","error":"HTTP 405"}'
    });

    await fetchService.fetch(URL_WITH_ROUTE);

    const logs = debug.mock.calls.join();

    expect(logs).toContain('apikey=*******');
    expect(logs).toContain('api_token=*******');
    expect(logs).not.toContain('secret');

    debug.mockRestore();
  });

  it('should call the model with temperature 0 and the configured engine', async () => {
    mockGenerateText({ text: BODY });

    await fetchService.fetch(URL_WITH_ROUTE);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'model',
        temperature: 0,
        tools: {
          web_fetch: expect.objectContaining({
            args: { parameters: { engine: 'parallel' } }
          })
        }
      })
    );
  });

  it.each([
    ['a failure message', { text: FAILURE_MESSAGE }],
    ['a text without JSON', { text: 'The fetch did not succeed.' }],
    ['an empty text', { text: '' }],
    ['a truncated body', { finishReason: 'length', text: BODY }],
    ['a content filter', { finishReason: 'content-filter', text: BODY }]
  ])('should use the direct request on %s', async (_, result) => {
    mockGenerateText(result);

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe('direct');

    expect(directFetch).toHaveBeenCalledTimes(1);
  });

  it('should use the direct request on an error of the model', async () => {
    (generateText as jest.Mock).mockRejectedValue(new Error('Timeout'));

    const response = await fetchService.fetch(URL_WITH_ROUTE);

    await expect(response.text()).resolves.toBe('direct');
  });

  it('should get a body which is not JSON for a route without a content type', async () => {
    mockGenerateText({ text: 'Plain text' });

    const response = await fetchService.fetch('https://example.org/page');

    await expect(response.text()).resolves.toBe('Plain text');

    expect(directFetch).not.toHaveBeenCalled();
  });

  it('should reject a failure message for a route without a content type', async () => {
    mockGenerateText({ text: FAILURE_MESSAGE });

    const response = await fetchService.fetch('https://example.org/page');

    await expect(response.text()).resolves.toBe('direct');
  });

  it('should not use the model without an API key', async () => {
    delete properties[PROPERTY_API_KEY_OPENROUTER];

    await fetchService.fetch(URL_WITH_ROUTE);

    expect(generateText).not.toHaveBeenCalled();
    expect(directFetch).toHaveBeenCalledTimes(1);
  });

  it('should not use the model for a request other than GET', async () => {
    await fetchService.fetch(URL_WITH_ROUTE, { method: 'POST' });

    expect(generateText).not.toHaveBeenCalled();
    expect(directFetch).toHaveBeenCalledTimes(1);
  });

  describe('logging', () => {
    let error: jest.SpyInstance;
    let log: jest.SpyInstance;
    let warn: jest.SpyInstance;

    beforeEach(() => {
      error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      error.mockRestore();
      log.mockRestore();
      warn.mockRestore();
    });

    it('should log a successful web fetch', async () => {
      mockGenerateText({ text: BODY });

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toMatch(
        /\(engine=parallel finishReason=stop model=model duration=\d+ms\)$/
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('should log the finish reason of a body from a source', async () => {
      mockGenerateText({
        finishReason: 'length',
        sources: [{ providerMetadata: { openrouter: { content: BODY } } }],
        text: '{"items":['
      });

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(log.mock.calls[0][0]).toContain('finishReason=length');
      expect(warn).not.toHaveBeenCalled();
    });

    it.each(['apikey', 'APIKEY', 'api_token', 'key', 'token'])(
      'should redact the query parameter %s in the log of a successful web fetch',
      async (name) => {
        mockGenerateText({ text: BODY });

        await fetchService.fetch(`${URL_WITH_ROUTE}?${name}=secret&a=b`);

        expect(log.mock.calls[0][0]).toContain(`${name}=*******&a=b`);
        expect(log.mock.calls[0][0]).not.toContain('secret');
      }
    );

    it.each([
      [
        'a failure message',
        { text: FAILURE_MESSAGE },
        'reason=failure_message error="HTTP 405: Method Not Allowed"'
      ],
      [
        'a failure message with an empty error',
        { text: '{"url":"u","status":"failed","error":""}' },
        'reason=failure_message error="(empty)"'
      ],
      [
        'a failure message of a source before a text without JSON',
        {
          sources: [
            { providerMetadata: { openrouter: { content: FAILURE_MESSAGE } } }
          ],
          text: 'Sorry.'
        },
        'reason=failure_message error="HTTP 405: Method Not Allowed"'
      ],
      [
        'a failure message after a source without JSON',
        {
          sources: [
            { providerMetadata: { openrouter: { content: 'Sorry.' } } }
          ],
          text: FAILURE_MESSAGE
        },
        'reason=failure_message error="HTTP 405: Method Not Allowed"'
      ],
      ['a text without JSON', { text: 'Sorry.' }, 'reason=invalid_body'],
      ['an empty text', { text: '' }, 'reason=empty_body'],
      [
        'a truncated body',
        { finishReason: 'length', text: BODY },
        'finishReason=length model=model duration='
      ],
      [
        'the reason of a truncated body',
        { finishReason: 'length', text: BODY },
        'reason=finish_reason'
      ]
    ])('should log one warning on %s', async (_, result, expected) => {
      mockGenerateText(result);

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(expected);
      expect(log).not.toHaveBeenCalled();
    });

    it.each([
      ['https://www.example.com?unknown=secret', 'No access to [url]'],
      [
        'https://www.example.com?u=https%3A%2F%2Fx%3Fapikey%3Dsecret',
        'No access to [url]'
      ],
      ['HTTPS://www.example.com?apikey=secret', 'No access to [url]']
    ])(
      'should replace the URL %s in the error of a failure message',
      async (url, expected) => {
        mockGenerateText({
          text: JSON.stringify({
            error: `No access to ${url}`,
            status: 'failed',
            url: 'https://www.example.com'
          })
        });

        await fetchService.fetch(URL_WITH_ROUTE);

        expect(warn.mock.calls[0][0]).toContain(`error="${expected}"`);
        expect(warn.mock.calls[0][0]).not.toContain('secret');
      }
    );

    it('should redact the API keys outside of a URL in the error of a failure message', async () => {
      mockGenerateText({
        text: '{"url":"https://www.example.com","status":"failed","error":"Invalid apikey=secret"}'
      });

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn.mock.calls[0][0]).toContain('apikey=*******');
      expect(warn.mock.calls[0][0]).not.toContain('secret');
    });

    it('should log an error of the model', async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0]).toMatch(
        /\(engine=parallel model=model duration=\d+ms reason=request_error\): Timeout$/
      );
    });

    it('should log the name of a missing model', async () => {
      delete properties[PROPERTY_OPENROUTER_MODEL_WEB_FETCH];

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(
        `reason=missing_configuration missing=${PROPERTY_OPENROUTER_MODEL})`
      );
      expect(warn.mock.calls[0][0]).not.toContain('api-key');
    });

    it('should log the name of a missing API key', async () => {
      delete properties[PROPERTY_API_KEY_OPENROUTER];

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(
        `reason=missing_configuration missing=${PROPERTY_API_KEY_OPENROUTER})`
      );
    });

    it('should log the names of a missing API key and model', async () => {
      delete properties[PROPERTY_API_KEY_OPENROUTER];
      delete properties[PROPERTY_OPENROUTER_MODEL_WEB_FETCH];

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn.mock.calls[0][0]).toContain(
        `missing=${PROPERTY_API_KEY_OPENROUTER},${PROPERTY_OPENROUTER_MODEL})`
      );
    });

    it('should log a missing configuration only one time', async () => {
      delete properties[PROPERTY_API_KEY_OPENROUTER];

      await fetchService.fetch(URL_WITH_ROUTE);
      await fetchService.fetch(URL_WITH_ROUTE);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(directFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation of the routes', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('should accept valid routes without a warning', async () => {
      await fetchService.onModuleInit();

      expect(warn).not.toHaveBeenCalled();
    });

    it('should accept a missing property without a warning', async () => {
      delete properties[PROPERTY_WEB_FETCH_ROUTES];

      await fetchService.onModuleInit();

      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ['an object', { domain: 'example.com' }],
      ['a string', 'example.com'],
      ['a number', 1]
    ])('should ignore %s as the value of the property', async (_, value) => {
      properties[PROPERTY_WEB_FETCH_ROUTES] = value;

      await fetchService.onModuleInit();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('It must be an array');

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(generateText).not.toHaveBeenCalled();
    });

    it.each([
      ['a route which is not an object', 'example.com'],
      ['a route without a domain', {}],
      ['a domain with a protocol', { domain: 'https://example.com' }],
      ['a domain with a path', { domain: 'example.com/data' }],
      [
        'a content type which is not a string',
        { domain: 'example.com', responseContentType: 1 }
      ]
    ])('should ignore %s and keep the valid routes', async (_, route) => {
      mockGenerateText({ text: 'Plain text' });

      properties[PROPERTY_WEB_FETCH_ROUTES] = [
        route,
        { domain: 'example.org' }
      ];

      await fetchService.onModuleInit();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('Ignoring an invalid route');

      await fetchService.fetch(URL_WITH_ROUTE);

      expect(generateText).not.toHaveBeenCalled();

      await fetchService.fetch('https://example.org/page');

      expect(generateText).toHaveBeenCalledTimes(1);
    });
  });

  it('should not use the model for a domain without a route', async () => {
    await fetchService.fetch('https://www.ghostfol.io');

    expect(generateText).not.toHaveBeenCalled();
    expect(directFetch).toHaveBeenCalledTimes(1);
  });
});
