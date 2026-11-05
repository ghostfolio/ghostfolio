import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { UserService } from '@ghostfolio/api/services/user/user.service';
import { HEADER_KEY_TOKEN } from '@ghostfolio/common/config';

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createMcpAuthorizationMiddleware } from './mcp-authorization.middleware';

describe('createMcpAuthorizationMiddleware', () => {
  let configurationService: ConfigurationService;
  let impersonationService: ImpersonationService;
  let mockConfig: Record<string, any>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let userService: UserService;

  beforeEach(() => {
    mockConfig = {
      ENABLE_FEATURE_MCP: true,
      ENABLE_FEATURE_MCP_OAUTH: false,
      ENABLE_FEATURE_SUBSCRIPTION: false,
      ROOT_URL: 'http://localhost:3333'
    };

    configurationService = {
      get: jest.fn((key: string) => {
        return mockConfig[key];
      })
    } as unknown as ConfigurationService;

    impersonationService = {
      resolve: jest.fn()
    } as unknown as ImpersonationService;

    userService = {
      isDailyRequestLimitExceeded: jest.fn(),
      updateAnalytics: jest.fn(),
      user: jest.fn()
    } as unknown as UserService;

    mockRequest = {
      headers: {}
    };

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();
  });

  it('returns 401 challenge with only realm when token is missing and OAuth is disabled', async () => {
    mockConfig.ENABLE_FEATURE_MCP_OAUTH = false;
    jest.mocked(impersonationService.resolve).mockResolvedValueOnce({
      isActive: false
    } as any);

    const middleware = createMcpAuthorizationMiddleware({
      configurationService,
      impersonationService,
      userService
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer realm="Ghostfolio"'
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('returns 401 challenge with resource_metadata when token is missing and OAuth is enabled', async () => {
    mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
    jest.mocked(impersonationService.resolve).mockResolvedValueOnce({
      isActive: false
    } as any);

    const middleware = createMcpAuthorizationMiddleware({
      configurationService,
      impersonationService,
      userService
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer realm="Ghostfolio", resource_metadata="http://localhost:3333/.well-known/oauth-protected-resource/mcp"'
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('returns 401 with invalid_token when token is invalid and OAuth is enabled', async () => {
    mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
    mockRequest.headers = {
      [HEADER_KEY_TOKEN.toLowerCase()]: 'Bearer invalid-token'
    };

    jest.mocked(impersonationService.resolve).mockResolvedValueOnce({
      isActive: false
    } as any);

    const middleware = createMcpAuthorizationMiddleware({
      configurationService,
      impersonationService,
      userService
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer realm="Ghostfolio", resource_metadata="http://localhost:3333/.well-known/oauth-protected-resource/mcp", error="invalid_token", error_description="The access cannot be resolved"'
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('calls next() when access resolves successfully', async () => {
    const impersonation = {
      isActive: true,
      userId: 'test-user-id'
    };

    mockRequest.headers = {
      [HEADER_KEY_TOKEN.toLowerCase()]: 'Bearer valid-access-id'
    };

    jest
      .mocked(impersonationService.resolve)
      .mockResolvedValueOnce(impersonation as any);

    const middleware = createMcpAuthorizationMiddleware({
      configurationService,
      impersonationService,
      userService
    });

    await middleware(
      mockRequest as any,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect((mockRequest as any).impersonationOfBearerToken).toBe(impersonation);
  });
});
