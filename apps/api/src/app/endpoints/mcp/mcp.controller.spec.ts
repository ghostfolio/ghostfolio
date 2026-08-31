import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_MAX_ACTIVITIES } from '@ghostfolio/common/config';
import { Activity } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

import { DataSource, Type as ActivityType } from '@prisma/client';

import {
  GhostfolioMcpController,
  IMPORT_ACTIVITIES_PARAMETERS
} from './mcp.controller';

// The controller reads the columns of the tables from the AiService, which
// imports two packages which ship as an ECMAScript module only, which Jest
// cannot transform. The mocks only make the imports resolvable, because no
// test calls them.
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});

jest.mock('ai', () => {
  return { generateText: jest.fn() };
});

function createActivity(overrides: Record<string, unknown> = {}) {
  return {
    currency: 'USD',
    date: '2024-01-01',
    fee: 0,
    quantity: 1,
    symbol: 'AAPL',
    type: ActivityType.BUY,
    unitPrice: 100,
    ...overrides
  };
}

describe('GhostfolioMcpController', () => {
  // The AccessPermissionGuard puts the user into the impersonation context
  const impersonation = {
    user: { id: 'user-id' } as UserWithSettings,
    userId: 'user-id'
  } as ImpersonationContext;

  let configuration: Record<string, unknown>;
  let configurationService: ConfigurationService;
  let controller: GhostfolioMcpController;
  let importService: ImportService;

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

    importService = {
      import: jest.fn().mockResolvedValue([])
    } as unknown as ImportService;

    controller = new GhostfolioMcpController(
      undefined,
      undefined,
      configurationService,
      importService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Import activities', () => {
    it('Requires the scope to create an activity', () => {
      expect(
        Reflect.getMetadata(
          REQUIRES_SCOPE_KEY,
          GhostfolioMcpController.prototype.importActivities
        )
      ).toEqual([scopes.activityCreate]);
    });

    it('Requires the permission to create an activity', () => {
      expect(
        Reflect.getMetadata(
          HAS_PERMISSION_KEY,
          GhostfolioMcpController.prototype.importActivities
        )
      ).toEqual(permissions.createActivity);
    });

    it('Imports the activities for the user of the access', async () => {
      await controller.importActivities(impersonation, {
        activities: [createActivity()]
      });

      expect(importService.import).toHaveBeenCalledWith(
        expect.objectContaining({ user: impersonation.user })
      );
    });

    it('Gives the number of the imported and of the skipped activities', async () => {
      jest
        .spyOn(importService, 'import')
        .mockResolvedValue([{ id: 'activity-id' } as Activity]);

      expect(
        await controller.importActivities(impersonation, {
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
      configuration.DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER = [DataSource.YAHOO];
      configuration.ENABLE_FEATURE_SUBSCRIPTION = true;

      await controller.importActivities(impersonation, {
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
      configuration.DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER = [DataSource.YAHOO];
      configuration.ENABLE_FEATURE_SUBSCRIPTION = false;

      await controller.importActivities(impersonation, {
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

    // The McpToolExceptionFilter turns an error into the answer of the caller
    it('Passes on an error of the import', async () => {
      const error = new Error(
        'Unique constraint failed on the fields: (dataSource)'
      );

      jest.spyOn(importService, 'import').mockRejectedValue(error);

      await expect(
        controller.importActivities(impersonation, {
          activities: [createActivity()]
        })
      ).rejects.toThrow(error);
    });
  });

  describe('Scopes of the read tools', () => {
    it.each([
      ['getAccounts', scopes.accountRead],
      ['getActivities', scopes.activityRead],
      ['getHoldings', scopes.portfolioRead]
    ])('%s requires the scope %s', (methodName, scope) => {
      expect(
        Reflect.getMetadata(
          REQUIRES_SCOPE_KEY,
          GhostfolioMcpController.prototype[methodName]
        )
      ).toEqual([scope]);
    });

    it('Requires no permission, because a read tool reads granted data only', () => {
      expect(
        Reflect.getMetadata(
          HAS_PERMISSION_KEY,
          GhostfolioMcpController.prototype.getHoldings
        )
      ).toBeUndefined();
    });
  });

  describe('Parameters of the tool to import activities', () => {
    function parse(activities: unknown[]) {
      return IMPORT_ACTIVITIES_PARAMETERS.safeParse({ activities }).success;
    }

    it('Refuses a currency in lower case', () => {
      expect(parse([createActivity({ currency: 'usd' })])).toBe(false);
    });

    it('Accepts a currency in upper case', () => {
      expect(parse([createActivity({ currency: 'USD' })])).toBe(true);
    });

    it('Refuses a date at or before the epoch', () => {
      expect(parse([createActivity({ date: '0000-01-01' })])).toBe(false);
    });

    it('Refuses an empty symbol', () => {
      expect(parse([createActivity({ symbol: '' })])).toBe(false);
    });

    it('Refuses an empty identifier of an account', () => {
      expect(parse([createActivity({ accountId: '' })])).toBe(false);
    });

    it('Removes a tag, because the tool takes no tag', () => {
      expect(
        IMPORT_ACTIVITIES_PARAMETERS.parse({
          activities: [createActivity({ tags: ['tag-id'] })]
        }).activities[0]
      ).not.toHaveProperty('tags');
    });

    it(`Refuses more than ${MCP_MAX_ACTIVITIES} activities`, () => {
      expect(
        parse(
          Array.from({ length: MCP_MAX_ACTIVITIES + 1 }, () => {
            return createActivity();
          })
        )
      ).toBe(false);
    });
  });
});
