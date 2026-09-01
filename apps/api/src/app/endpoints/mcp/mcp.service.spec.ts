import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { Activity } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import { DataSource, Type as ActivityType } from '@prisma/client';
import { z } from 'zod';

import { IMPORT_ACTIVITIES_PARAMETERS } from './mcp.schemas';
import { McpService } from './mcp.service';

// The service reads the tables from the AiService, which imports two packages
// which ship as an ECMAScript module only, which Jest cannot transform. The
// mocks only make the imports resolvable, because no test calls them.
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});

jest.mock('ai', () => {
  return { generateText: jest.fn() };
});

type ActivityToImport = z.infer<
  typeof IMPORT_ACTIVITIES_PARAMETERS
>['activities'][number];

function createActivity(
  overrides: Partial<ActivityToImport> = {}
): ActivityToImport {
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

describe('McpService', () => {
  const userId = 'user-id';

  let configuration: Record<string, unknown>;
  let configurationService: ConfigurationService;
  let importService: ImportService;
  let mcpService: McpService;
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

    importService = {
      import: jest.fn().mockResolvedValue([])
    } as unknown as ImportService;

    userService = { user: jest.fn() } as unknown as UserService;

    mcpService = new McpService(
      undefined,
      undefined,
      configurationService,
      importService,
      userService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
