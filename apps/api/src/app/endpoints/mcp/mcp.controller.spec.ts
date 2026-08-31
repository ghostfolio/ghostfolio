import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
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

import { HttpException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, Type as ActivityType } from '@prisma/client';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

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
  const impersonation = { userId: 'user-id' } as ImpersonationContext;

  let configuration: Record<string, unknown>;
  let configurationService: ConfigurationService;
  let controller: GhostfolioMcpController;
  let importService: ImportService;
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

    controller = new GhostfolioMcpController(
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

  describe('Import activities', () => {
    it('Requires the scope to create an activity', () => {
      expect(
        Reflect.getMetadata(
          REQUIRES_SCOPE_KEY,
          GhostfolioMcpController.prototype.importActivities
        )
      ).toEqual([scopes.activityCreate]);
    });

    it('Refuses a user without the permission to create an activity', async () => {
      setupUser([]);

      await expect(
        controller.importActivities(impersonation, {
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
      setupUser([permissions.createActivity]);

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
      setupUser([permissions.createActivity]);

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

    it('Passes on the message of a validation only', async () => {
      setupUser([permissions.createActivity]);

      jest
        .spyOn(importService, 'import')
        .mockRejectedValue(
          new ImportValidationError('activities.0.symbol ("X") is not valid')
        );

      await expect(
        controller.importActivities(impersonation, {
          activities: [createActivity()]
        })
      ).rejects.toThrow(
        new RpcException('activities.0.symbol ("X") is not valid')
      );
    });

    it('Hides the message of an unexpected error and writes it to the log', async () => {
      setupUser([permissions.createActivity]);

      const error = new Error(
        'Unique constraint failed on the fields: (dataSource)'
      );

      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      jest.spyOn(importService, 'import').mockRejectedValue(error);

      await expect(
        controller.importActivities(impersonation, {
          activities: [createActivity()]
        })
      ).rejects.toThrow(
        new RpcException(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
      );

      expect(logError).toHaveBeenCalledWith(error);
    });

    it('Does not write the message of a validation to the log', async () => {
      setupUser([permissions.createActivity]);

      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      jest
        .spyOn(importService, 'import')
        .mockRejectedValue(
          new ImportValidationError('activities.0.accountId ("X") is not valid')
        );

      await expect(
        controller.importActivities(impersonation, {
          activities: [createActivity({ accountId: 'X' })]
        })
      ).rejects.toThrow(RpcException);

      expect(logError).not.toHaveBeenCalled();
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
