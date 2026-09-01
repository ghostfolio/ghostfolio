import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { Scope, scopes } from '@ghostfolio/common/scopes';

import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA
} from '@nestjs/common/constants';
import { MCP_TOOL_METADATA_KEY, ToolMetadata } from '@rekog/mcp-nest';

import { GhostfolioMcpController } from './mcp.controller';

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

describe('GhostfolioMcpController', () => {
  // A tool without the decorator of the scope would be open to every access,
  // hence a new tool has to declare its scope
  it('Requires a scope of access for each tool', () => {
    const toolMethodNames = getToolMethodNames();

    expect(toolMethodNames.length).toBeGreaterThan(0);

    const toolMethodNamesWithoutScope = toolMethodNames.filter((methodName) => {
      return !getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, methodName)
        ?.length;
    });

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

  it('Requires the scope to create an activity for the tool to import activities', () => {
    expect(
      getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, 'importActivities')
    ).toEqual([scopes.activityCreate]);
  });

  // The tools have no try and catch, hence the filter is the only guarantee
  // that an unexpected exception does not expose internals
  it('Applies the filter of the exceptions of the tools', () => {
    expect(
      Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, GhostfolioMcpController)
    ).toEqual([McpToolExceptionFilter]);
  });
});
