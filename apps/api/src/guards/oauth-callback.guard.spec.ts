import { Logger } from '@nestjs/common';

import { OAuthCallbackGuard } from './oauth-callback.guard';

describe('OAuthCallbackGuard', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined as any);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getGuardInstance(strategy = 'oidc') {
    const Guard = OAuthCallbackGuard(strategy);
    return new (Guard as any)();
  }

  it('should return user when authentication succeeds', () => {
    const guard = getGuardInstance('oidc');
    const user = { jwt: 'token' };

    const result = guard.handleRequest(null, user, null, null, null);

    expect(result).toBe(user);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should log error when err is provided', () => {
    const guard = getGuardInstance('oidc');
    const err = new Error('token exchange failed');

    const result = guard.handleRequest(err, false, null, null, null);

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Authentication with the oidc strategy has failed')
    );
  });

  it('should log warn when user is falsy and info is provided (silent failure case)', () => {
    const guard = getGuardInstance('oidc');
    const info = new Error('Invalid state');

    const result = guard.handleRequest(null, undefined, info, null, null);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Authentication with the oidc strategy has failed')
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid state'));
  });

  it('should log warn when user is falsy without info (OidcStateStore verify failure)', () => {
    const guard = getGuardInstance('oidc');

    const result = guard.handleRequest(null, null, null, null, null);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Authentication with the oidc strategy has failed')
    );
  });

  it('should log both error and warn when err and !user with info', () => {
    const guard = getGuardInstance('oidc');
    const err = new Error('exchange error');
    const info = 'State mismatch';

    const result = guard.handleRequest(err, undefined, info, null, null);

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('State mismatch'));
  });

  it('should log warn with stringified info when info is object', () => {
    const guard = getGuardInstance('oidc');
    const info = { message: 'invalid_token' };

    guard.handleRequest(null, undefined, info, null, null);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid_token')
    );
  });

  it('should keep generic strategy name in log', () => {
    const guard = getGuardInstance('google');
    guard.handleRequest(null, undefined, 'some info', null, null);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('google')
    );
  });
});
