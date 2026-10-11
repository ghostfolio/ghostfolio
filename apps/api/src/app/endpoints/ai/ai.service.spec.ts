import { McpService } from '@ghostfolio/api/app/endpoints/mcp/mcp.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_LOCALE,
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_AGENT,
  PROPERTY_OPENROUTER_MODEL_VISION
} from '@ghostfolio/common/config';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Type as ActivityType } from '@prisma/client';
import { generateText, isStepCount, ToolSet } from 'ai';
import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT, ROW_MATCHES_OUTPUT } from './ai.schemas';
import { AiService } from './ai.service';
import { createActivityRow } from './ai.test-utils';
import { AccountToMatch } from './types/account-to-match.type';
import { ActivityRow } from './types/activity-row.type';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});
jest.mock('ai', () => {
  return {
    generateText: jest.fn(),
    isStepCount: jest.fn((stepCount: number) => {
      return { stepCount };
    }),
    Output: {
      object: jest.fn((options: unknown) => {
        return options;
      })
    },
    tool: jest.fn((options: unknown) => {
      return options;
    })
  };
});

describe('AiService', () => {
  const abortSignal = new AbortController().signal;
  const model = { modelId: 'model' };

  const rows: ActivityRow[] = [
    createActivityRow({ accountName: null, symbol: null })
  ];

  let aiService: AiService;
  let chat: jest.Mock;
  let mcpService: McpService;
  let properties: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    chat = jest.fn().mockReturnValue(model);

    jest
      .mocked(createOpenRouter)
      .mockReturnValue({ chat } as unknown as ReturnType<
        typeof createOpenRouter
      >);

    jest.mocked(generateText).mockResolvedValue({
      output: { rows },
      steps: [{}],
      totalUsage: { totalTokens: 1000 }
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    properties = {
      [PROPERTY_API_KEY_OPENROUTER]: 'api-key',
      [PROPERTY_OPENROUTER_MODEL]: 'general-model',
      [PROPERTY_OPENROUTER_MODEL_AGENT]: 'agent-model',
      [PROPERTY_OPENROUTER_MODEL_VISION]: 'vision-model'
    };

    mcpService = {
      searchAssetProfiles: jest.fn().mockResolvedValue({
        content: [{ text: '{ "assetProfiles": [] }', type: 'text' }]
      })
    } as unknown as McpService;

    const propertyService = {
      getByKey: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(properties[key]);
      })
    } as unknown as PropertyService;

    aiService = new AiService(
      {} as ConfigurationService,
      mcpService,
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

  describe('getActivitiesFromFile', () => {
    const file = {
      buffer: Buffer.from('%PDF-1.7'),
      mediaType: 'application/pdf'
    };

    const user = {
      accounts: [{ currency: 'CHF', id: 'account-id', name: 'Brokerage' }],
      id: 'user-id',
      settings: { settings: { baseCurrency: 'EUR', locale: 'de-CH' } }
    } as unknown as UserWithSettings;

    it('Reads the rows of the file and matches them with the accounts, the base currency and the id of the user', async () => {
      const activities = [
        {
          currency: 'USD',
          dataSource: 'YAHOO',
          date: '2026-01-15',
          fee: 1,
          quantity: 10,
          symbol: 'AAPL',
          type: ActivityType.BUY,
          unitPrice: 230
        }
      ];

      jest.spyOn(aiService, 'getActivityRowsFromFile').mockResolvedValue(rows);

      jest
        .spyOn(aiService, 'getActivitiesFromRows')
        .mockResolvedValue({ activities, rowsWithoutMatch: [] });

      await expect(
        aiService.getActivitiesFromFile({ abortSignal, file, user })
      ).resolves.toEqual({ activities, rowsWithoutMatch: [] });

      expect(aiService.getActivityRowsFromFile).toHaveBeenCalledWith({
        abortSignal,
        file,
        locale: 'de-CH'
      });

      expect(aiService.getActivitiesFromRows).toHaveBeenCalledWith({
        abortSignal,
        rows,
        accounts: user.accounts,
        userCurrency: 'EUR',
        userId: 'user-id'
      });
    });

    it('Reads the file in the default locale if the user has no locale', async () => {
      jest.spyOn(aiService, 'getActivityRowsFromFile').mockResolvedValue([]);

      jest
        .spyOn(aiService, 'getActivitiesFromRows')
        .mockResolvedValue({ activities: [], rowsWithoutMatch: [] });

      await aiService.getActivitiesFromFile({
        file,
        user: {
          ...user,
          settings: { settings: { baseCurrency: 'EUR' } }
        } as unknown as UserWithSettings
      });

      expect(aiService.getActivityRowsFromFile).toHaveBeenCalledWith(
        expect.objectContaining({ locale: DEFAULT_LOCALE })
      );
    });
  });

  describe('getActivitiesFromRows', () => {
    const accounts: AccountToMatch[] = [
      { currency: 'CHF', id: 'account-id', name: 'Brokerage' }
    ];

    const userCurrency = 'EUR';
    const userId = 'user-id';

    function mockRowMatches({
      accounts: accountMatches = [],
      assets: assetMatches = []
    }: Partial<z.infer<typeof ROW_MATCHES_OUTPUT>>) {
      jest.mocked(generateText).mockResolvedValueOnce({
        output: { accounts: accountMatches, assets: assetMatches },
        steps: [{}, {}],
        totalUsage: { totalTokens: 2000 }
      } as unknown as Awaited<ReturnType<typeof generateText>>);
    }

    it('Gives an activity for each row whose asset matches an asset profile', async () => {
      const row = createActivityRow({ currency: null });

      mockRowMatches({
        accounts: [{ accountId: 'account-id', name: 'Brokerage' }],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({
        activities: [
          {
            accountId: 'account-id',
            currency: 'USD',
            dataSource: 'YAHOO',
            date: row.date,
            fee: row.fee,
            quantity: row.quantity,
            symbol: 'AAPL',
            type: ActivityType.BUY,
            unitPrice: row.unitPrice
          }
        ],
        rowsWithoutMatch: []
      });
    });

    it('Gives the currency of the row before the currency of the asset profile', async () => {
      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow({ accountName: null, currency: 'CHF' })]
      });

      expect(activities[0].currency).toBe('CHF');
    });

    it('Gives a row whose asset has no match as a row without a match', async () => {
      const row = createActivityRow({ accountName: null });

      mockRowMatches({
        assets: [{ currency: null, dataSource: null, id: 0, symbol: null }]
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });
    });

    it('Gives a row with a data source which is not valid as a row without a match', async () => {
      const row = createActivityRow({ accountName: null });

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'yahoo', id: 0, symbol: 'AAPL' }
        ]
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });
    });

    it('Ignores an account id which is not the id of an account of the user', async () => {
      mockRowMatches({
        accounts: [{ accountId: 'unknown-account-id', name: 'Brokerage' }],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(activities[0].accountId).toBeUndefined();
    });

    it('Gives a fee, an interest or a liability its description as symbol without a model call', async () => {
      const rowsOfNonInvestments = [
        ActivityType.FEE,
        ActivityType.INTEREST,
        ActivityType.LIABILITY
      ].map((type) => {
        return createActivityRow({
          type,
          accountName: null,
          currency: null,
          isin: null,
          name: `Description of ${type}`,
          symbol: null
        });
      });

      const { activities, rowsWithoutMatch } =
        await aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: rowsOfNonInvestments
        });

      expect(generateText).not.toHaveBeenCalled();

      expect(
        activities.map(({ currency, dataSource, symbol, type }) => {
          return { currency, dataSource, symbol, type };
        })
      ).toEqual(
        rowsOfNonInvestments.map(({ name, type }) => {
          return {
            type,
            currency: userCurrency,
            dataSource: undefined,
            symbol: name
          };
        })
      );

      expect(rowsWithoutMatch).toEqual([]);
    });

    it('Gives a fee without a currency the currency of its account', async () => {
      mockRowMatches({
        accounts: [{ accountId: 'account-id', name: 'Brokerage' }]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [
          createActivityRow({
            currency: null,
            isin: null,
            name: 'Custody fee',
            symbol: null,
            type: ActivityType.FEE
          })
        ]
      });

      expect(activities[0]).toMatchObject({
        accountId: 'account-id',
        currency: 'CHF'
      });
    });

    it('Gives a fee without a description as a row without a match', async () => {
      const row = createActivityRow({
        accountName: null,
        isin: null,
        name: null,
        symbol: null,
        type: ActivityType.FEE
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });
    });

    it('Passes each asset one time and only the id and the name of each account to the model', async () => {
      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [
          createActivityRow(),
          createActivityRow({ type: ActivityType.SELL }),
          createActivityRow({
            accountName: 'Depot 1',
            type: ActivityType.DIVIDEND
          })
        ]
      });

      expect(activities).toHaveLength(3);

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).toEqual({
        accountNames: ['Brokerage', 'Depot 1'],
        accounts: [{ id: 'account-id', name: 'Brokerage' }],
        assets: [
          {
            currency: 'USD',
            id: 0,
            isin: 'US0378331005',
            name: 'Apple Inc.',
            symbol: 'AAPL'
          }
        ]
      });
    });

    it('Searches the asset profiles with the tool of the server of the Model Context Protocol', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      const { tools } = jest.mocked(generateText).mock.calls[0][0] as {
        tools: ToolSet;
      };

      await expect(
        tools['search-asset-profiles'].execute(
          { query: 'US0378331005' },
          undefined
        )
      ).resolves.toBe('{ "assetProfiles": [] }');

      expect(mcpService.searchAssetProfiles).toHaveBeenCalledWith({
        userId,
        query: 'US0378331005'
      });
    });

    it('Restricts the routing to endpoints with zero data retention and limits the number of steps', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        abortSignal,
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(chat).toHaveBeenCalledWith('agent-model', {
        provider: { zdr: true }
      });

      expect(isStepCount).toHaveBeenCalled();

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal,
          model,
          output: { schema: ROW_MATCHES_OUTPUT }
        })
      );

      const { stopWhen } = jest.mocked(generateText).mock.calls[0][0];

      expect(stopWhen).toBe(jest.mocked(isStepCount).mock.results[0].value);
    });

    it('Falls back to the general model if no agent model is set', async () => {
      delete properties[PROPERTY_OPENROUTER_MODEL_AGENT];

      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(chat).toHaveBeenCalledWith('general-model', expect.any(Object));
    });
  });
});
