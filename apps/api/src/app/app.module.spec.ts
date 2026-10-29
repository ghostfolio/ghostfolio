import { ALLOW_DURING_IMPERSONATION_KEY } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';

import {
  DynamicModule,
  ForwardReference,
  RequestMethod,
  Type,
  VERSION_NEUTRAL
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
  VERSION_METADATA
} from '@nestjs/common/constants';
import { VersionValue } from '@nestjs/common/interfaces';
import { MetadataScanner } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { isUndefined, omitBy } from 'lodash-es';

import { AppModule } from './app.module';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return {};
});
jest.mock('ai', () => {
  return {};
});

// A queue of Bull connects to Redis on its creation
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => {
    return { close: jest.fn() };
  });
});

type ModuleDefinition =
  DynamicModule | ForwardReference<() => Type> | Promise<DynamicModule> | Type;

/**
 * The strategies of the authentication which the routes apply via
 * AuthGuard(). The class of such a guard has a random name, hence the
 * snapshot of the routes names it by its strategy
 */
const AUTHENTICATION_STRATEGIES = ['api-key', 'google', 'jwt', 'oidc'];

/**
 * The routes of the controllers which answer a request without the
 * authentication of a user or of an API key, sorted by the request method and
 * the path. A new route has to apply AuthGuard('api-key') or AuthGuard('jwt')
 * (e.g. via the decorator RequiresScope) or has to be added here.
 *
 * The MCP transport, Bull Board and the static files are not covered, as they
 * are not served by a controller
 */
const PUBLIC_ROUTES = [
  'GET /assets/:languageCode/site.webmanifest',
  'GET /auth/google',
  'GET /auth/google/callback',
  'GET /auth/oidc',
  'GET /auth/oidc/callback',
  'GET /benchmarks',
  'GET /health',
  'GET /health/data-enhancer/:name',
  'GET /health/data-provider/:dataSource',
  'GET /health/liveness',
  'GET /info',
  'GET /logo',
  'GET /logo/:dataSource/:symbol',
  'GET /public/:accessId/portfolio',
  'GET /sitemap.xml',
  'GET /subscription/stripe/callback',
  'POST /auth/anonymous',
  'POST /auth/webauthn/generate-authentication-options',
  'POST /auth/webauthn/verify-authentication',
  'POST /user'
];

/**
 * Gives the controllers of the module and of each module which it imports
 */
async function getControllers(
  moduleDefinition: ModuleDefinition,
  visitedModules = new Set<DynamicModule | Type>()
): Promise<Type[]> {
  const resolvedModule = await ('forwardRef' in moduleDefinition
    ? moduleDefinition.forwardRef()
    : moduleDefinition);

  if (visitedModules.has(resolvedModule)) {
    return [];
  }

  visitedModules.add(resolvedModule);

  const isDynamicModule = 'module' in resolvedModule;

  const controllers = [
    ...(isDynamicModule
      ? (resolvedModule.controllers ?? [])
      : ((Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, resolvedModule) ??
          []) as Type[]))
  ];

  const importedModules = isDynamicModule
    ? [resolvedModule.module, ...(resolvedModule.imports ?? [])]
    : ((Reflect.getMetadata(MODULE_METADATA.IMPORTS, resolvedModule) ??
        []) as ModuleDefinition[]);

  for (const importedModule of importedModules) {
    controllers.push(...(await getControllers(importedModule, visitedModules)));
  }

  return [...new Set(controllers)];
}

/**
 * Gives the guards or the interceptors which the decorators of the controller
 * and of the route handler set, in the order in which they run
 */
function getEnhancers(key: string, controller: Type, routeHandler: object) {
  return [controller, routeHandler].flatMap((target) => {
    return (Reflect.getMetadata(key, target) ?? []) as Type[];
  });
}

/**
 * Gives the metadata of the route handler or, if it has none, of the
 * controller, as Reflector.getAllAndOverride() does
 */
function getMetadataOfRoute<T>(
  key: string,
  controller: Type,
  routeHandler: object
) {
  return (Reflect.getMetadata(key, routeHandler) ??
    Reflect.getMetadata(key, controller)) as T | undefined;
}

/**
 * Gives the name of a guard or of an interceptor. The function mixin()
 * replaces the name of a class by a random one, hence the name is read from
 * the declaration of the class. A guard which extends AuthGuard() is named
 * with its strategy
 */
function getName(enhancer: Type) {
  const authenticationStrategy = AUTHENTICATION_STRATEGIES.find((strategy) => {
    return AuthGuard(strategy) === enhancer;
  });

  if (authenticationStrategy) {
    return `AuthGuard('${authenticationStrategy}')`;
  }

  const name = /^class\s+([\w$]+)/.exec(enhancer.toString())?.[1];

  if (!name || name === 'MixinAuthGuard') {
    throw new Error('The name of a guard or of an interceptor is unknown');
  }

  const parentStrategy = AUTHENTICATION_STRATEGIES.find((strategy) => {
    return Object.getPrototypeOf(enhancer) === AuthGuard(strategy);
  });

  return parentStrategy ? `${name}('${parentStrategy}')` : name;
}

/**
 * Gives the paths which the decorator of a controller or of a route sets
 */
function getPaths(target: object) {
  return [
    (Reflect.getMetadata(PATH_METADATA, target) ?? '') as string | string[]
  ].flat();
}

/**
 * Gives the routes of the controller, each as the request method and the path
 * with its route handler
 */
function getRoutes(controller: Type) {
  const routeHandlersByName = controller.prototype as Record<string, object>;

  return new MetadataScanner()
    .getAllMethodNames(routeHandlersByName)
    .flatMap((methodName) => {
      const routeHandler = routeHandlersByName[methodName];
      const requestMethod = Reflect.getMetadata(
        METHOD_METADATA,
        routeHandler
      ) as RequestMethod | undefined;

      if (requestMethod === undefined) {
        return [];
      }

      return getPaths(controller).flatMap((controllerPath) => {
        return getPaths(routeHandler).map((routePath) => {
          const path = `${controllerPath}/${routePath}`
            .split('/')
            .filter(Boolean)
            .join('/');

          return {
            routeHandler,
            route: `${RequestMethod[requestMethod]} /${path}`
          };
        });
      });
    });
}

/**
 * Gives the routes of the controller which apply neither AuthGuard('api-key')
 * nor AuthGuard('jwt'), each as the request method and the path
 */
function getRoutesWithoutAuthentication(controller: Type) {
  const authenticationGuards: unknown[] = [
    AuthGuard('api-key'),
    AuthGuard('jwt')
  ];

  return getRoutes(controller)
    .filter(({ routeHandler }) => {
      const hasAuthentication = getEnhancers(
        GUARDS_METADATA,
        controller,
        routeHandler
      ).some((guard) => {
        return authenticationGuards.includes(guard);
      });

      return !hasAuthentication;
    })
    .map(({ route }) => {
      return route;
    });
}

/**
 * Gives the routes of the controller, each as the request method, the path
 * and the version with the guards and the interceptors in the order in which
 * they run, the permission, the scopes and whether the route stays available
 * while an impersonation is active
 */
function getRoutesWithSecurity(controller: Type) {
  return getRoutes(controller).map(({ route, routeHandler }) => {
    const security = omitBy(
      {
        allowDuringImpersonation: getMetadataOfRoute<boolean>(
          ALLOW_DURING_IMPERSONATION_KEY,
          controller,
          routeHandler
        ),
        guards: getEnhancers(GUARDS_METADATA, controller, routeHandler).map(
          (guard) => {
            return getName(guard);
          }
        ),
        interceptors: getEnhancers(
          INTERCEPTORS_METADATA,
          controller,
          routeHandler
        ).map((interceptor) => {
          return getName(interceptor);
        }),
        // HasPermissionGuard reads the permission of the route handler only
        permission: Reflect.getMetadata(HAS_PERMISSION_KEY, routeHandler) as
          string | undefined,
        scopes: getMetadataOfRoute<string[]>(
          REQUIRES_SCOPE_KEY,
          controller,
          routeHandler
        )
      },
      isUndefined
    );

    return [
      `${route}${getVersionSuffix(controller, routeHandler)}`,
      security
    ] as const;
  });
}

/**
 * Gives the version of the route as a suffix of its key, which is empty for
 * the default version
 */
function getVersionSuffix(controller: Type, routeHandler: object) {
  const version = getMetadataOfRoute<VersionValue>(
    VERSION_METADATA,
    controller,
    routeHandler
  );

  if (version === undefined) {
    return '';
  }

  const versions = [version].flat().map((value) => {
    return value === VERSION_NEUTRAL ? 'neutral' : value;
  });

  return ` (version ${versions.join(', ')})`;
}

describe('AppModule', () => {
  it('should require the authentication for each route which is not public', async () => {
    const controllers = await getControllers(AppModule);

    const routesWithoutAuthentication = controllers
      .flatMap((controller) => {
        return getRoutesWithoutAuthentication(controller);
      })
      .sort();

    expect(routesWithoutAuthentication).toEqual(PUBLIC_ROUTES);
  });

  // An intended change of a route is confirmed by an update of the snapshot
  // (--updateSnapshot), hence each change shows in the review
  it('should keep the security of each route', async () => {
    const controllers = await getControllers(AppModule);

    const routesWithSecurity = controllers.flatMap((controller) => {
      return getRoutesWithSecurity(controller);
    });

    const routes = routesWithSecurity.map(([route]) => {
      return route;
    });

    // The snapshot is an object, which would hide a route declared twice
    expect(new Set(routes).size).toBe(routes.length);
    expect(Object.fromEntries(routesWithSecurity)).toMatchSnapshot();
  });

  it('should resolve the dependencies of each provider', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    try {
      expect(testingModule.get(AppModule)).toBeInstanceOf(AppModule);
    } finally {
      await testingModule.close();
    }
  });
});
