import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_VISION
} from '@ghostfolio/common/config';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Type as ActivityType } from '@prisma/client';
import { generateText } from 'ai';

import { ACTIVITY_ROWS_OUTPUT } from './ai.schemas';
import { AiService } from './ai.service';
import { ActivityRow } from './types/activity-row.type';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});
jest.mock('ai', () => {
  return {
    generateText: jest.fn(),
    Output: {
      object: jest.fn((options: unknown) => {
        return options;
      })
    }
  };
});

describe('AiService', () => {
  const abortSignal = new AbortController().signal;
  const model = { modelId: 'model' };

  const rows: ActivityRow[] = [
    {
      accountName: null,
      currency: 'USD',
      date: '2026-01-15',
      fee: 1,
      isin: 'US0378331005',
      name: 'Apple Inc.',
      quantity: 10,
      symbol: null,
      type: ActivityType.BUY,
      unitPrice: 230
    }
  ];

  let aiService: AiService;
  let chat: jest.Mock;
  let properties: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();

    chat = jest.fn().mockReturnValue(model);

    jest
      .mocked(createOpenRouter)
      .mockReturnValue({ chat } as unknown as ReturnType<
        typeof createOpenRouter
      >);

    jest.mocked(generateText).mockResolvedValue({
      output: { rows }
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    properties = {
      [PROPERTY_API_KEY_OPENROUTER]: 'api-key',
      [PROPERTY_OPENROUTER_MODEL]: 'general-model',
      [PROPERTY_OPENROUTER_MODEL_VISION]: 'vision-model'
    };

    const propertyService = {
      getByKey: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(properties[key]);
      })
    } as unknown as PropertyService;

    aiService = new AiService(
      {} as ConfigurationService,
      {} as PortfolioTableService,
      propertyService
    );
  });

  describe('getActivityRowsFromFile', () => {
    it('Passes a PDF file as a file part to the vision model and gives the rows', async () => {
      const buffer = Buffer.from('%PDF-1.7');

      await expect(
        aiService.getActivityRowsFromFile({
          abortSignal,
          file: { buffer, mediaType: 'application/pdf' },
          locale: 'de-CH'
        })
      ).resolves.toEqual(rows);

      expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'api-key' });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal,
          messages: [
            {
              content: [
                { data: buffer, mediaType: 'application/pdf', type: 'file' }
              ],
              role: 'user'
            }
          ],
          model,
          output: { schema: ACTIVITY_ROWS_OUTPUT }
        })
      );
    });

    it('Passes a CSV file as text', async () => {
      const csv = 'Date;Type;ISIN\n15.01.2026;Kauf;US0378331005';

      await aiService.getActivityRowsFromFile({
        file: { buffer: Buffer.from(csv), mediaType: 'text/csv' },
        locale: 'de-CH'
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ content: [{ text: csv, type: 'text' }], role: 'user' }]
        })
      );
    });

    it('Restricts the routing to endpoints with zero data retention and passes a PDF file to the model itself', async () => {
      await aiService.getActivityRowsFromFile({
        file: { buffer: Buffer.from('%PDF-1.7'), mediaType: 'application/pdf' },
        locale: 'de-CH'
      });

      expect(chat).toHaveBeenCalledWith('vision-model', {
        plugins: [{ id: 'file-parser', pdf: { engine: 'native' } }],
        provider: { zdr: true }
      });
    });

    it('Falls back to the general model if no vision model is set', async () => {
      delete properties[PROPERTY_OPENROUTER_MODEL_VISION];

      await aiService.getActivityRowsFromFile({
        file: { buffer: Buffer.from('%PDF-1.7'), mediaType: 'application/pdf' },
        locale: 'de-CH'
      });

      expect(chat).toHaveBeenCalledWith('general-model', expect.any(Object));
    });

    it('Gives the locale and the date of today in the instructions', async () => {
      jest.useFakeTimers({ now: new Date('2026-10-11T12:00:00Z') });

      try {
        await aiService.getActivityRowsFromFile({
          file: {
            buffer: Buffer.from('%PDF-1.7'),
            mediaType: 'application/pdf'
          },
          locale: 'de-CH'
        });
      } finally {
        jest.useRealTimers();
      }

      const { instructions } = jest.mocked(generateText).mock.calls[0][0];

      expect(instructions).toContain('the locale de-CH');
      expect(instructions).toContain('Today is 2026-10-11');
    });
  });
});
