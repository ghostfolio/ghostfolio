import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_MAX_ACTIVITIES } from '@ghostfolio/common/config';
import { Activity } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { Scope, scopes } from '@ghostfolio/common/scopes';
import type {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA
} from '@nestjs/common/constants';
import { DataSource, Type as ActivityType } from '@prisma/client';
import { MCP_TOOL_METADATA_KEY, ToolMetadata } from '@rekog/mcp-nest';

import { GhostfolioMcpController } from './mcp.controller';
import { IMPORT_ACTIVITIES_PARAMETERS } from './mcp.schemas';
import { McpService } from './mcp.service';

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

/**
 * Gives the metadata which a decorator sets on the method of a tool. The
 * prototype is read by the name of the method, hence the type of the metadata
 * is given by the caller.
 */
function getMetadataOfMethod<T>(metadataKey: string, methodName: string) {
  const methodsByName = GhostfolioMcpController.prototype as unknown as Record<
    string,
    object
  >;

  return Reflect.getMetadata(metadataKey, methodsByName[methodName]) as T;
}

function getToolMethodNames() {
  return Object.getOwnPropertyNames(GhostfolioMcpController.prototype).filter(
    (methodName) => {
      return Boolean(
        getMetadataOfMethod<ToolMetadata>(MCP_TOOL_METADATA_KEY, methodName)
      );
    }
  );
}

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
      new McpService(),
      userService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tools', () => {
    // A tool without the decorator of the scope would be open to every access,
    // hence a new tool has to declare its scope
    it('Requires a scope of access for each tool', () => {
      const toolMethodNames = getToolMethodNames();

      expect(toolMethodNames.length).toBeGreaterThan(0);

      const toolMethodNamesWithoutScope = toolMethodNames.filter(
        (methodName) => {
          return !getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, methodName)
            ?.length;
        }
      );

      expect(toolMethodNamesWithoutScope).toEqual([]);
    });

    // The decorator RequiresScope sets the same metadata as the decorator
    // RequiresScopeOfAccess, but applies AuthGuard('jwt'), which a request of
    // an access cannot pass, hence the guards tell the two decorators apart
    it('Applies the guard of the access to each tool', () => {
      const toolMethodNames = getToolMethodNames();

      expect(toolMethodNames.length).toBeGreaterThan(0);

      const toolMethodNamesWithoutGuardOfAccess = toolMethodNames.filter(
        (methodName) => {
          return !getMetadataOfMethod<unknown[]>(
            GUARDS_METADATA,
            methodName
          )?.includes(AccessGuard);
        }
      );

      expect(toolMethodNamesWithoutGuardOfAccess).toEqual([]);
    });

    // The tools have no try and catch, hence the filter is the only guarantee
    // that an unexpected exception does not expose internals
    it('Applies the filter of the exceptions of the tools', () => {
      expect(
        Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, GhostfolioMcpController)
      ).toEqual([McpToolExceptionFilter]);
    });
  });

  describe('Import activities', () => {
    it('Requires the scope to create an activity', () => {
      expect(
        getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, 'importActivities')
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

    // The McpToolExceptionFilter maps the error, hence the tool passes it on
    it('Passes on an error of the import', async () => {
      setupUser([permissions.createActivity]);

      const error = new ImportValidationError(
        'activities.0.symbol ("X") is not valid'
      );

      jest.spyOn(importService, 'import').mockRejectedValue(error);

      await expect(
        controller.importActivities(impersonation, {
          activities: [createActivity()]
        })
      ).rejects.toBe(error);
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
