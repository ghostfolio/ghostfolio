import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_ENGINE_WEB_FETCH,
  PROPERTY_OPENROUTER_MODEL_WEB_FETCH,
  PROPERTY_WEB_FETCH_ROUTES
} from '@ghostfolio/common/config';

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

  it('should not use the model for a domain without a route', async () => {
    await fetchService.fetch('https://www.ghostfol.io');

    expect(generateText).not.toHaveBeenCalled();
    expect(directFetch).toHaveBeenCalledTimes(1);
  });
});
