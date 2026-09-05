import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import {
  DEFAULT_LANGUAGE_CODE,
  MCP_MAX_ACTIVITIES
} from '@ghostfolio/common/config';
import { Activity, Filter } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import { AssetClass, DataSource, Type as ActivityType } from '@prisma/client';

import { McpService } from './mcp.service';
import { createActivity } from './mcp.test-utils';

describe('McpService', () => {
  const filters: Filter[] = [{ id: 'account-id', type: 'ACCOUNT' }];
  const userCurrency = 'USD';
  const userId = 'user-id';

  let apiService: ApiService;
  let configuration: Record<string, unknown>;
  let configurationService: ConfigurationService;
  let importService: ImportService;
  let mcpService: McpService;
  let portfolioTableService: PortfolioTableService;
  let userService: UserService;

  function setupUser(userPermissions: string[]) {
    jest.spyOn(userService, 'user').mockResolvedValue({
      permissions: userPermissions
    } as UserWithSettings);
  }

  beforeEach(() => {
    configuration = {
      DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [],
      ENABLE_FEATURE_SUBSCRIPTION: false
    };

    configurationService = {
      get: jest.fn().mockImplementation((key: string) => {
        return configuration[key];
      })
    } as unknown as ConfigurationService;

    apiService = {
      buildFiltersFromQueryParams: jest.fn().mockReturnValue(filters)
    } as unknown as ApiService;

    importService = {
      import: jest.fn().mockResolvedValue([])
    } as unknown as ImportService;

    portfolioTableService = {
      getAccountsTable: jest.fn().mockResolvedValue('## Accounts'),
      getActivitiesTable: jest.fn().mockResolvedValue('## Activities'),
      getHoldingsTable: jest.fn().mockResolvedValue('## Holdings')
    } as unknown as PortfolioTableService;

    userService = { user: jest.fn() } as unknown as UserService;

    mcpService = new McpService(
      apiService,
      configurationService,
      importService,
      portfolioTableService,
      userService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAccounts', () => {
    it('Maps the parameters of the tool to the filters', async () => {
      await mcpService.getAccounts({
        userId,
        accountIds: ['account-id'],
        assetClasses: [AssetClass.EQUITY],
        holding: { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      });

      expect(apiService.buildFiltersFromQueryParams).toHaveBeenCalledWith({
        filterByAccounts: ['account-id'],
        filterByAssetClasses: [AssetClass.EQUITY],
        filterByDataSource: DataSource.YAHOO,
        filterBySymbol: 'AAPL'
      });
    });

    it('Gives the table of the accounts of the filters', async () => {
      expect(await mcpService.getAccounts({ userId })).toEqual({
        content: [{ text: '## Accounts', type: 'text' }]
      });

      expect(portfolioTableService.getAccountsTable).toHaveBeenCalledWith({
        filters,
        userId
      });
    });
  });

  describe('getActivities', () => {
    function getActivities(
      parameters: Partial<Parameters<McpService['getActivities']>[0]> = {}
    ) {
      return mcpService.getActivities({
        userCurrency,
        userId,
        take: MCP_MAX_ACTIVITIES,
        ...parameters
      });
    }

    it('Maps the parameters of the tool to the filters', async () => {
      await getActivities({
        assetClasses: [AssetClass.EQUITY],
        holding: { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      });

      expect(apiService.buildFiltersFromQueryParams).toHaveBeenCalledWith({
        filterByAssetClasses: [AssetClass.EQUITY],
        filterByDataSource: DataSource.YAHOO,
        filterBySymbol: 'AAPL'
      });
    });

    it('Changes the range into the start date and the end date', async () => {
      await getActivities({ range: '2024' });

      expect(portfolioTableService.getActivitiesTable).toHaveBeenCalledWith(
        expect.objectContaining({
          endDate: new Date('2024-12-31T23:59:59.999Z'),
          startDate: new Date('2023-12-31T23:59:59.999Z')
        })
      );
    });

    it('Gives no date if the range is absent', async () => {
      await getActivities();

      expect(portfolioTableService.getActivitiesTable).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: undefined, startDate: undefined })
      );
    });

    it('Gives the table of the activities of the filters', async () => {
      expect(
        await getActivities({ activityTypes: [ActivityType.BUY], skip: 10 })
      ).toEqual({ content: [{ text: '## Activities', type: 'text' }] });

      expect(portfolioTableService.getActivitiesTable).toHaveBeenCalledWith({
        filters,
        userCurrency,
        userId,
        endDate: undefined,
        skip: 10,
        startDate: undefined,
        take: MCP_MAX_ACTIVITIES,
        types: [ActivityType.BUY]
      });
    });
  });

  describe('getPortfolio', () => {
    it('Gives the table of the holdings in the default language', async () => {
      expect(await mcpService.getPortfolio({ userId })).toEqual({
        content: [{ text: '## Holdings', type: 'text' }]
      });

      expect(portfolioTableService.getHoldingsTable).toHaveBeenCalledWith({
        userId,
        languageCode: DEFAULT_LANGUAGE_CODE
      });
    });
  });

  describe('importActivities', () => {
    it('Refuses a user without the permission to create an activity', async () => {
      setupUser([]);

      await expect(
        mcpService.importActivities({
          userId,
          activities: [createActivity()]
        })
      ).rejects.toThrow(HttpException);

      expect(importService.import).not.toHaveBeenCalled();
    });

    it('Gives the number of the imported and of the skipped activities', async () => {
      setupUser([permissions.createActivity]);

      jest
        .spyOn(importService, 'import')
        .mockResolvedValue([{ id: 'activity-id' } as Activity]);

      expect(
        await mcpService.importActivities({
          userId,
          activities: [createActivity(), createActivity({ quantity: 2 })]
        })
      ).toEqual({
        content: [
          {
            text: 'Imported activities: 1\nSkipped duplicate activities: 1',
            type: 'text'
          }
        ]
      });
    });

    it('Resolves the mask of the data source of the Ghostfolio data provider', async () => {
      setupUser([permissions.createActivity]);

      configuration.DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER = [DataSource.YAHOO];
      configuration.ENABLE_FEATURE_SUBSCRIPTION = true;

      await mcpService.importActivities({
        userId,
        activities: [createActivity({ dataSource: DataSource.GHOSTFOLIO })]
      });

      expect(importService.import).toHaveBeenCalledWith(
        expect.objectContaining({
          activitiesDto: [
            expect.objectContaining({ dataSource: DataSource.YAHOO })
          ]
        })
      );
    });

    it('Keeps the data source if the subscription is not enabled', async () => {
      setupUser([permissions.createActivity]);

      configuration.DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER = [DataSource.YAHOO];
      configuration.ENABLE_FEATURE_SUBSCRIPTION = false;

      await mcpService.importActivities({
        userId,
        activities: [createActivity({ dataSource: DataSource.GHOSTFOLIO })]
      });

      expect(importService.import).toHaveBeenCalledWith(
        expect.objectContaining({
          activitiesDto: [
            expect.objectContaining({ dataSource: DataSource.GHOSTFOLIO })
          ]
        })
      );
    });

    // The McpToolExceptionFilter maps the error, hence the tool passes it on
    it('Passes on an error of the import', async () => {
      setupUser([permissions.createActivity]);

      const error = new ImportValidationError(
        'activities.0.symbol ("X") is not valid'
      );

      jest.spyOn(importService, 'import').mockRejectedValue(error);

      await expect(
        mcpService.importActivities({
          userId,
          activities: [createActivity()]
        })
      ).rejects.toBe(error);
    });
  });
});
