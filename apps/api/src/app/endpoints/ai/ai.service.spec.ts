import { McpService } from '@ghostfolio/api/app/endpoints/mcp/mcp.service';
import { CallerFacingError } from '@ghostfolio/api/errors/caller-facing.error';
import { encodeDataSource } from '@ghostfolio/api/helper/data-source.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_LOCALE,
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_AGENT,
  PROPERTY_OPENROUTER_MODEL_VISION
} from '@ghostfolio/common/config';
import { isValidCustomAssetProfileSymbol } from '@ghostfolio/common/helper';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { DataSource, Type as ActivityType } from '@prisma/client';
import { generateText, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT, ROW_MATCHES_OUTPUT } from './ai.schemas';
import { AiService } from './ai.service';
import { createActivityRow } from './ai.test-utils';
import { AccountHint } from './types/account-hint.type';
import { AccountToMatch } from './types/account-to-match.type';
import { ActivityRow } from './types/activity-row.type';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});
jest.mock('ai', () => {
  return {
    generateText: jest.fn(),
    NoObjectGeneratedError: class MockNoObjectGeneratedError extends Error {
      public readonly finishReason: string;

      public constructor({ finishReason }: { finishReason: string }) {
        super('No object generated');

        this.finishReason = finishReason;
      }

      public static isInstance(error: unknown) {
        return error instanceof MockNoObjectGeneratedError;
      }
    },
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
    createActivityRow({ accountName: null, symbol: null })
  ];

  let aiService: AiService;
  let chat: jest.Mock;
  let dataProviderService: DataProviderService;
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
      output: { broker: 'Swissquote', rows },
      steps: [{}],
      totalUsage: { totalTokens: 1000 }
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    properties = {
      [PROPERTY_API_KEY_OPENROUTER]: 'api-key',
      [PROPERTY_OPENROUTER_MODEL]: 'general-model',
      [PROPERTY_OPENROUTER_MODEL_AGENT]: 'agent-model',
      [PROPERTY_OPENROUTER_MODEL_VISION]: 'vision-model'
    };

    dataProviderService = {
      getDataSources: jest
        .fn()
        .mockResolvedValue([DataSource.MANUAL, DataSource.YAHOO])
    } as unknown as DataProviderService;

    mcpService = {
      getAccounts: jest.fn().mockResolvedValue({
        content: [{ text: '## Accounts', type: 'text' }]
      }),
      getAssetProfilesOfUser: jest.fn().mockResolvedValue([]),
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
      { get: jest.fn() } as unknown as ConfigurationService,
      dataProviderService,
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
      ).resolves.toEqual({ broker: 'Swissquote', rows });

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

    it('Passes the name of the file as text before the file and gives the broker', async () => {
      const buffer = Buffer.from('%PDF-1.7');

      await expect(
        aiService.getActivityRowsFromFile({
          file: {
            buffer,
            mediaType: 'application/pdf',
            name: 'swissquote-2022.pdf'
          },
          locale: 'de-CH'
        })
      ).resolves.toEqual({ broker: 'Swissquote', rows });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              content: [
                { text: 'File name: swissquote-2022.pdf', type: 'text' },
                { data: buffer, mediaType: 'application/pdf', type: 'file' }
              ],
              role: 'user'
            }
          ]
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

    it('Restricts the routing to endpoints with zero data retention, disables the reasoning, sets the temperature to 0 and passes a PDF file to the model itself', async () => {
      await aiService.getActivityRowsFromFile({
        file: { buffer: Buffer.from('%PDF-1.7'), mediaType: 'application/pdf' },
        locale: 'de-CH'
      });

      expect(chat).toHaveBeenCalledWith('vision-model', {
        plugins: [{ id: 'file-parser', pdf: { engine: 'native' } }],
        provider: { require_parameters: true, zdr: true },
        reasoning: { effort: 'none' },
        usage: { include: true }
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0 })
      );
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

    it('Tells the vision model that a national number of a security is not a ticker symbol', async () => {
      await aiService.getActivityRowsFromFile({
        file: {
          buffer: Buffer.from('%PDF-1.7'),
          mediaType: 'application/pdf'
        },
        locale: 'de-CH'
      });

      const { instructions } = jest.mocked(generateText).mock.calls[0][0];

      expect(instructions).toContain(
        'A national number of a security, for example a valor (NKN), a WKN or a CUSIP, is not a ticker symbol.'
      );
    });

    it('Tells the vision model to add the fees of a buy or a sell to its row', async () => {
      await aiService.getActivityRowsFromFile({
        file: {
          buffer: Buffer.from('%PDF-1.7'),
          mediaType: 'application/pdf'
        },
        locale: 'de-CH'
      });

      const { instructions } = jest.mocked(generateText).mock.calls[0][0];

      expect(instructions).toContain(
        'Add every fee, commission and tax of a buy or a sell, for example a commission, a stamp duty or an exchange fee, to the fee of its row.'
      );
    });

    it('Gives an error for the caller if a cut output reaches the maximum number of output tokens', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      jest.mocked(generateText).mockRejectedValueOnce(
        new NoObjectGeneratedError({
          finishReason: 'length'
        } as ConstructorParameters<typeof NoObjectGeneratedError>[0])
      );

      await expect(
        aiService.getActivityRowsFromFile({
          file: {
            buffer: Buffer.from('%PDF-1.7'),
            mediaType: 'application/pdf'
          },
          locale: 'de-CH'
        })
      ).rejects.toThrow(CallerFacingError);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('Gives an error for the caller if an output without any text reaches the maximum number of output tokens', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      jest.mocked(generateText).mockResolvedValueOnce({
        finishReason: 'length',
        get output() {
          throw new Error('No output generated');
        }
      } as unknown as Awaited<ReturnType<typeof generateText>>);

      await expect(
        aiService.getActivityRowsFromFile({
          file: {
            buffer: Buffer.from('%PDF-1.7'),
            mediaType: 'application/pdf'
          },
          locale: 'de-CH'
        })
      ).rejects.toThrow(CallerFacingError);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('Passes on every other error of the vision model', async () => {
      const error = new NoObjectGeneratedError({
        finishReason: 'stop'
      } as ConstructorParameters<typeof NoObjectGeneratedError>[0]);

      jest.mocked(generateText).mockRejectedValueOnce(error);

      await expect(
        aiService.getActivityRowsFromFile({
          file: {
            buffer: Buffer.from('%PDF-1.7'),
            mediaType: 'application/pdf'
          },
          locale: 'de-CH'
        })
      ).rejects.toBe(error);
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

      jest
        .spyOn(aiService, 'getActivityRowsFromFile')
        .mockResolvedValue({ broker: 'Swissquote', rows });

      jest
        .spyOn(aiService, 'getActivitiesFromRows')
        .mockResolvedValue({ activities, rowsWithoutMatch: [] });

      await expect(
        aiService.getActivitiesFromFile({ abortSignal, file, user })
      ).resolves.toEqual({
        activities,
        assetProfiles: [],
        rowsWithoutMatch: []
      });

      expect(aiService.getActivityRowsFromFile).toHaveBeenCalledWith({
        abortSignal,
        file,
        locale: 'de-CH'
      });

      expect(aiService.getActivitiesFromRows).toHaveBeenCalledWith({
        abortSignal,
        rows,
        accounts: user.accounts,
        broker: 'Swissquote',
        userCurrency: 'EUR',
        userId: 'user-id'
      });
    });

    it('Gives a fee, an interest or a liability a custom asset profile with its description as name', async () => {
      const fee = {
        currency: 'CHF',
        date: '2026-01-15',
        fee: 5,
        quantity: 0,
        symbol: 'Custody fee',
        type: ActivityType.FEE,
        unitPrice: 0
      };

      jest
        .spyOn(aiService, 'getActivityRowsFromFile')
        .mockResolvedValue({ broker: 'Swissquote', rows });

      jest.spyOn(aiService, 'getActivitiesFromRows').mockResolvedValue({
        activities: [fee, { ...fee, date: '2026-02-15' }],
        rowsWithoutMatch: []
      });

      const { activities, assetProfiles } =
        await aiService.getActivitiesFromFile({ file, user });

      const [{ symbol }] = assetProfiles;

      expect(isValidCustomAssetProfileSymbol(symbol)).toBe(true);

      expect(assetProfiles).toEqual([
        {
          symbol,
          currency: 'CHF',
          dataSource: DataSource.MANUAL,
          name: 'Custody fee'
        }
      ]);

      expect(activities).toEqual([
        { ...fee, symbol, dataSource: DataSource.MANUAL },
        { ...fee, symbol, dataSource: DataSource.MANUAL, date: '2026-02-15' }
      ]);
    });

    it('Reads the file in the default locale if the user has no locale', async () => {
      jest
        .spyOn(aiService, 'getActivityRowsFromFile')
        .mockResolvedValue({ broker: null, rows: [] });

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

    const rowOfMicrosoft = createActivityRow({
      accountName: null,
      isin: 'US5949181045',
      name: 'Microsoft Corporation',
      symbol: 'MSFT'
    });

    const userCurrency = 'EUR';
    const userId = 'user-id';

    function mockRowMatches({
      accounts: accountMatches = [],
      assetProfilesOfSearch,
      assets: assetMatches = []
    }: Partial<z.infer<typeof ROW_MATCHES_OUTPUT>> & {
      assetProfilesOfSearch?: { dataSource: string; symbol: string }[];
    }) {
      jest.mocked(mcpService.searchAssetProfiles).mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              assetProfiles: assetProfilesOfSearch ?? assetMatches
            }),
            type: 'text'
          }
        ]
      });

      jest.mocked(generateText).mockResolvedValueOnce({
        output: { accounts: accountMatches, assets: assetMatches },
        steps: [{}],
        totalUsage: { totalTokens: 2000 }
      } as unknown as Awaited<ReturnType<typeof generateText>>);
    }

    function mockSearches(
      searchResultByQuery: Record<
        string,
        { dataSource: string; symbol: string }[] | Error
      >
    ) {
      jest
        .mocked(mcpService.searchAssetProfiles)
        .mockImplementation(({ query }) => {
          const searchResult = searchResultByQuery[query] ?? [];

          if (searchResult instanceof Error) {
            return Promise.reject(searchResult);
          }

          return Promise.resolve({
            content: [
              {
                text: JSON.stringify({ assetProfiles: searchResult }),
                type: 'text' as const
              }
            ]
          });
        });
    }

    function mockHoldings({
      dataSource = 'YAHOO'
    }: { dataSource?: string } = {}) {
      jest.mocked(mcpService.getAssetProfilesOfUser).mockResolvedValue([
        {
          dataSource,
          currency: 'USD',
          isin: 'IE00BK5BQT80',
          name: 'Vanguard FTSE All-World UCITS ETF',
          symbol: 'VWRA.SW'
        },
        {
          dataSource,
          currency: 'USD',
          isin: null,
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      ]);
    }

    it('Gives an activity for each row whose asset matches an asset profile', async () => {
      const row = createActivityRow({ currency: null });

      mockRowMatches({
        accounts: [{ accountId: 'account-id', id: 0 }],
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

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Matched 1 of 1 assets and 1 of 1 account hints with 1 results of 1 searches'
        )
      );
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

    it('Gives the absolute values of a negative fee, quantity and unit price', async () => {
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
          createActivityRow({
            accountName: null,
            fee: -1,
            quantity: -10,
            type: ActivityType.SELL,
            unitPrice: -230
          })
        ]
      });

      expect(activities[0]).toMatchObject({
        fee: 1,
        quantity: 10,
        unitPrice: 230
      });
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

    it('Gives a row whose asset profile no search gave as a row without a match and logs the left out match', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const row = createActivityRow({ accountName: null });

      mockRowMatches({
        assetProfilesOfSearch: [{ dataSource: 'YAHOO', symbol: 'AAPL' }],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL.XX' }
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

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Matched 0 of 1 assets and 0 of 0 account hints with 1 results of 1 searches'
        )
      );

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Left out 1 asset matches which neither the search of their asset nor the holdings gave'
      );
    });

    it('Gives a row whose asset match only the search of another asset gave as a row without a match', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const rowOfApple = createActivityRow({ accountName: null });

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'MSFT' },
          { currency: 'USD', dataSource: 'YAHOO', id: 1, symbol: 'MSFT' }
        ]
      });

      mockSearches({
        US0378331005: [{ dataSource: 'YAHOO', symbol: 'AAPL' }],
        US5949181045: [{ dataSource: 'YAHOO', symbol: 'MSFT' }]
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [rowOfApple, rowOfMicrosoft]
        })
      ).resolves.toEqual({
        activities: [expect.objectContaining({ symbol: 'MSFT' })],
        rowsWithoutMatch: [rowOfApple]
      });

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Left out 1 asset matches which neither the search of their asset nor the holdings gave'
      );
    });

    it('Gives an activity for a row whose asset matches a holding which no search gave', async () => {
      const row = createActivityRow({
        accountName: null,
        currency: 'CHF',
        isin: 'IE00BK5BQT80',
        name: 'Vanguard FTSE All-World UCITS ETF USD Accumulating',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'VWRA.SW' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({
        activities: [
          expect.objectContaining({
            currency: 'CHF',
            dataSource: 'YAHOO',
            symbol: 'VWRA.SW'
          })
        ],
        rowsWithoutMatch: []
      });
    });

    it('Gives an activity for a row whose asset matches a holding with the same ISIN with spaces and in lower case', async () => {
      const row = createActivityRow({
        accountName: null,
        isin: 'ie00 bk5b qt80',
        name: 'Vanguard FTSE All-World UCITS ETF USD Accumulating',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'VWRA.SW' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({
        activities: [
          expect.objectContaining({ dataSource: 'YAHOO', symbol: 'VWRA.SW' })
        ],
        rowsWithoutMatch: []
      });
    });

    it('Gives an activity for a row whose asset matches a holding without an ISIN which no search gave', async () => {
      const row = createActivityRow({
        accountName: null,
        name: 'APPLE INC',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({
        activities: [
          expect.objectContaining({ dataSource: 'YAHOO', symbol: 'AAPL' })
        ],
        rowsWithoutMatch: []
      });
    });

    it('Gives a row whose asset match has the symbol of a holding but another data source as a row without a match', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const row = createActivityRow({
        accountName: null,
        isin: 'IE00BK5BQT80'
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'MANUAL', id: 0, symbol: 'VWRA.SW' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });
    });

    it('Gives a row whose asset match is a holding with another ISIN as a row without a match and logs the left out match', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const row = createActivityRow({
        accountName: null,
        isin: 'IE00B3RBWM25',
        name: 'Vanguard FTSE All-World UCITS ETF USD Distributing',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'VWRA.SW' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Left out 1 asset matches which neither the search of their asset nor the holdings gave'
      );
    });

    it('Gives an activity for a row whose asset matches a holding with an encoded data source and checks the decoded data source', async () => {
      const encodedDataSource = encodeDataSource(DataSource.YAHOO);

      const row = createActivityRow({
        accountName: null,
        isin: 'IE00BK5BQT80',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          {
            currency: 'USD',
            dataSource: encodedDataSource,
            id: 0,
            symbol: 'VWRA.SW'
          }
        ]
      });

      mockHoldings({ dataSource: encodedDataSource });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({
        activities: [
          expect.objectContaining({
            dataSource: encodedDataSource,
            symbol: 'VWRA.SW'
          })
        ],
        rowsWithoutMatch: []
      });
    });

    it('Passes no holding with a data source which is not configured to the model and gives a row whose asset match is such a holding as a row without a match', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      jest
        .mocked(dataProviderService.getDataSources)
        .mockResolvedValue([DataSource.MANUAL]);

      const row = createActivityRow({
        accountName: null,
        isin: 'IE00BK5BQT80',
        symbol: null
      });

      mockRowMatches({
        assetProfilesOfSearch: [],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'VWRA.SW' }
        ]
      });

      mockHoldings();

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [row]
        })
      ).resolves.toEqual({ activities: [], rowsWithoutMatch: [row] });

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).toHaveProperty('holdings', []);
    });

    it('Matches a row without an account name by the broker of the file', async () => {
      mockRowMatches({
        accounts: [{ accountId: 'account-id', id: 0 }],
        assets: [
          { currency: 'CHF', dataSource: 'YAHOO', id: 0, symbol: 'ROG.SW' }
        ]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        broker: 'Swissquote',
        rows: [
          createActivityRow({ accountName: null }),
          createActivityRow({ accountName: null, type: ActivityType.SELL })
        ]
      });

      expect(activities.map(({ accountId }) => accountId)).toEqual([
        'account-id',
        'account-id'
      ]);

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      const { accountHints } = JSON.parse(prompt as string) as {
        accountHints: AccountHint[];
      };

      expect(accountHints).toEqual([
        { accountName: null, broker: 'Swissquote', id: 0 }
      ]);
    });

    it('Ignores an account id which is not the id of an account of the user', async () => {
      mockRowMatches({
        accounts: [{ accountId: 'unknown-account-id', id: 0 }],
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
        accounts: [{ accountId: 'account-id', id: 0 }]
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

    it('Passes each asset with the asset profiles of its search, each account hint one time and the accounts to the model', async () => {
      mockRowMatches({
        assetProfilesOfSearch: [{ dataSource: 'YAHOO', symbol: 'AAPL' }],
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        broker: 'Swissquote',
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
        accountHints: [
          { accountName: 'Brokerage', broker: 'Swissquote', id: 0 },
          { accountName: 'Depot 1', broker: 'Swissquote', id: 1 }
        ],
        accounts: '## Accounts',
        assets: [
          {
            assetProfiles: [{ dataSource: 'YAHOO', symbol: 'AAPL' }],
            currency: 'USD',
            id: 0,
            isin: 'US0378331005',
            name: 'Apple Inc.',
            symbol: 'AAPL'
          }
        ],
        holdings: []
      });
    });

    it('Passes each asset with the asset profiles of its own search to the model', async () => {
      mockRowMatches({});

      mockSearches({
        US0378331005: [{ dataSource: 'YAHOO', symbol: 'AAPL' }],
        US5949181045: [{ dataSource: 'YAHOO', symbol: 'MSFT' }]
      });

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow({ accountName: null }), rowOfMicrosoft]
      });

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      const { assets } = JSON.parse(prompt as string) as {
        assets: { assetProfiles: unknown[]; id: number }[];
      };

      expect(
        assets.map(({ assetProfiles, id }) => {
          return { assetProfiles, id };
        })
      ).toEqual([
        { assetProfiles: [{ dataSource: 'YAHOO', symbol: 'AAPL' }], id: 0 },
        { assetProfiles: [{ dataSource: 'YAHOO', symbol: 'MSFT' }], id: 1 }
      ]);
    });

    it('Searches each asset with the tool of the server of the Model Context Protocol by the ISIN, then by the ticker symbol, then by the name, until a search gives asset profiles', async () => {
      mockRowMatches({});

      jest
        .mocked(mcpService.searchAssetProfiles)
        .mockResolvedValueOnce({
          content: [{ text: '{ "assetProfiles": [] }', type: 'text' }]
        })
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify({
                assetProfiles: [{ dataSource: 'YAHOO', symbol: 'AAPL' }]
              }),
              type: 'text'
            }
          ]
        });

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow({ accountName: null })]
      });

      expect(jest.mocked(mcpService.searchAssetProfiles).mock.calls).toEqual([
        [{ userId, query: 'US0378331005' }],
        [{ userId, query: 'AAPL' }]
      ]);
    });

    it('Does not search a missing or too short value of an asset', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [
          createActivityRow({
            accountName: null,
            isin: null,
            name: 'Visa Inc.',
            symbol: 'V'
          })
        ]
      });

      expect(jest.mocked(mcpService.searchAssetProfiles).mock.calls).toEqual([
        [{ userId, query: 'Visa Inc.' }]
      ]);
    });

    it('Searches the next value of an asset if a search fails and logs the failure', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      jest
        .mocked(mcpService.searchAssetProfiles)
        .mockRejectedValueOnce(new Error('Search failed'));

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow({ accountName: null })]
      });

      expect(activities).toEqual([expect.objectContaining({ symbol: 'AAPL' })]);

      expect(jest.mocked(mcpService.searchAssetProfiles).mock.calls).toEqual([
        [{ userId, query: 'US0378331005' }],
        [{ userId, query: 'AAPL' }]
      ]);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Could not search the asset profiles: Search failed'
      );
    });

    it('Gives the rows of an asset whose searches all fail as rows without a match and matches the other assets', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const rowOfApple = createActivityRow({ accountName: null });
      const searchError = new Error('Search failed');

      mockRowMatches({
        assets: [
          { currency: null, dataSource: null, id: 0, symbol: null },
          { currency: 'USD', dataSource: 'YAHOO', id: 1, symbol: 'MSFT' }
        ]
      });

      mockSearches({
        AAPL: searchError,
        'Apple Inc.': searchError,
        US0378331005: searchError,
        US5949181045: [{ dataSource: 'YAHOO', symbol: 'MSFT' }]
      });

      await expect(
        aiService.getActivitiesFromRows({
          accounts,
          userCurrency,
          userId,
          rows: [rowOfApple, rowOfMicrosoft]
        })
      ).resolves.toEqual({
        activities: [expect.objectContaining({ symbol: 'MSFT' })],
        rowsWithoutMatch: [rowOfApple]
      });

      expect(Logger.prototype.warn).toHaveBeenCalledTimes(3);
    });

    it('Gets the accounts with the tool of the server of the Model Context Protocol without values', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(mcpService.getAccounts).toHaveBeenCalledWith({
        userId,
        withValues: false
      });
    });

    it('Does not get the accounts without an account hint', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow({ accountName: null })]
      });

      expect(mcpService.getAccounts).not.toHaveBeenCalled();

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).not.toHaveProperty('accounts');
    });

    it('Passes no accounts to the model and continues if the accounts cannot be got', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      jest
        .mocked(mcpService.getAccounts)
        .mockRejectedValueOnce(new Error('Database failed'));

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(activities).toEqual([
        expect.objectContaining({ accountId: undefined, symbol: 'AAPL' })
      ]);

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).not.toHaveProperty('accounts');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Could not get the accounts: Database failed'
      );
    });

    it('Gets the holdings of the user from the server of the Model Context Protocol', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(mcpService.getAssetProfilesOfUser).toHaveBeenCalledWith({
        userId
      });
    });

    it('Passes the currency, the data source, the ISIN, the name and the symbol of each holding to the model', async () => {
      mockRowMatches({});

      mockHoldings();

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).toHaveProperty('holdings', [
        {
          currency: 'USD',
          dataSource: 'YAHOO',
          isin: 'IE00BK5BQT80',
          name: 'Vanguard FTSE All-World UCITS ETF',
          symbol: 'VWRA.SW'
        },
        {
          currency: 'USD',
          dataSource: 'YAHOO',
          isin: null,
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      ]);
    });

    it('Does not get the holdings without an asset', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [
          createActivityRow({
            fee: 5,
            name: 'Custody fee',
            quantity: 0,
            type: ActivityType.FEE,
            unitPrice: 0
          })
        ]
      });

      expect(mcpService.getAssetProfilesOfUser).not.toHaveBeenCalled();
      expect(dataProviderService.getDataSources).not.toHaveBeenCalled();

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).not.toHaveProperty('holdings');
    });

    it('Passes no holdings to the model and continues if the holdings cannot be got', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      jest
        .mocked(mcpService.getAssetProfilesOfUser)
        .mockRejectedValueOnce(new Error('Query failed'));

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(activities).toEqual([expect.objectContaining({ symbol: 'AAPL' })]);

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).not.toHaveProperty('holdings');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Could not get the holdings: Query failed'
      );
    });

    it('Passes no holdings to the model and continues if the data sources cannot be got', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      mockRowMatches({
        assets: [
          { currency: 'USD', dataSource: 'YAHOO', id: 0, symbol: 'AAPL' }
        ]
      });

      mockHoldings();

      jest
        .mocked(dataProviderService.getDataSources)
        .mockRejectedValueOnce(new Error('Database failed'));

      const { activities } = await aiService.getActivitiesFromRows({
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(activities).toEqual([expect.objectContaining({ symbol: 'AAPL' })]);

      const { prompt } = jest.mocked(generateText).mock.calls[0][0];

      expect(JSON.parse(prompt as string)).not.toHaveProperty('holdings');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Could not get the holdings: Database failed'
      );
    });

    it('Restricts the routing to endpoints with zero data retention, disables the reasoning, sets the temperature to 0 and gives the model no tools', async () => {
      mockRowMatches({});

      await aiService.getActivitiesFromRows({
        abortSignal,
        accounts,
        userCurrency,
        userId,
        rows: [createActivityRow()]
      });

      expect(chat).toHaveBeenCalledWith('agent-model', {
        provider: { require_parameters: true, zdr: true },
        reasoning: { effort: 'none' },
        usage: { include: true }
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal,
          model,
          output: { schema: ROW_MATCHES_OUTPUT },
          temperature: 0
        })
      );

      expect(jest.mocked(generateText).mock.calls[0][0]).not.toHaveProperty(
        'tools'
      );
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
