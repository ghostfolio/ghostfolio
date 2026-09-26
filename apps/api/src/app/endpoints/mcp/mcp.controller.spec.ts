import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { getMcpUserOfBearerToken } from '@ghostfolio/api/helper/bearer-token.helper';
import {
  getScopesOfAccess,
  getScopesOfAccessLevel,
  Scope,
  scopes
} from '@ghostfolio/common/scopes';

import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA
} from '@nestjs/common/constants';
import {
  AccessMatchMode,
  MCP_SCOPES_MATCH_METADATA_KEY,
  MCP_SCOPES_METADATA_KEY,
  MCP_TOOL_METADATA_KEY,
  ToolAuthorizationService,
  ToolMetadata
} from '@rekog/mcp-nest';

import { GhostfolioMcpController } from './mcp.controller';

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

/**
 * Gives the names of the tools which the transport lists for the request. The
 * metadata of each tool is read as the transport reads it.
 */
function getNamesOfListedTools(request: unknown) {
  const toolAuthorizationService = new ToolAuthorizationService();
  const user = getMcpUserOfBearerToken(request);

  return getToolMethodNames()
    .map((methodName) => {
      return {
        metadata: {
          ...getMetadataOfMethod<ToolMetadata>(
            MCP_TOOL_METADATA_KEY,
            methodName
          ),
          requiredScopes: getMetadataOfMethod<string[]>(
            MCP_SCOPES_METADATA_KEY,
            methodName
          ),
          requiredScopesMatch: getMetadataOfMethod<AccessMatchMode>(
            MCP_SCOPES_MATCH_METADATA_KEY,
            methodName
          )
        }
      };
    })
    .filter((tool) => {
      return toolAuthorizationService.canAccessTool(user, tool);
    })
    .map(({ metadata: { name } }) => {
      return name;
    });
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

  it('Lists only the tools to read for an access with the permission "Restricted view"', () => {
    expect(
      getNamesOfListedTools({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: getScopesOfAccess({
            scopes: getScopesOfAccessLevel('READ_RESTRICTED'),
            type: 'MCP'
          })
        }
      })
    ).toEqual([
      'get-accounts',
      'get-activities',
      'get-portfolio',
      'get-watchlist'
    ]);
  });

  it('Lists every tool for an access with the permission "Restricted view and manage"', () => {
    expect(
      getNamesOfListedTools({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: getScopesOfAccess({
            scopes: getScopesOfAccessLevel(
              'CREATE_READ_RESTRICTED_UPDATE_DELETE'
            ),
            type: 'MCP'
          })
        }
      })
    ).toEqual([
      'get-accounts',
      'get-activities',
      'get-portfolio',
      'get-watchlist',
      'import-activities',
      'search-asset-profiles'
    ]);
  });

  it('Lists no tool for an inactive access', () => {
    expect(
      getNamesOfListedTools({
        impersonationOfBearerToken: {
          isActive: false,
          scopes: getScopesOfAccessLevel('CREATE_READ_RESTRICTED_UPDATE_DELETE')
        }
      })
    ).toEqual([]);
  });

  it('Requires the scope to create an activity for the tool to import activities', () => {
    expect(
      getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, 'importActivities')
    ).toEqual([scopes.activityCreate]);
  });

  it('Requires the scope to create an activity for the tool to search asset profiles', () => {
    expect(
      getMetadataOfMethod<Scope[]>(REQUIRES_SCOPE_KEY, 'searchAssetProfiles')
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
