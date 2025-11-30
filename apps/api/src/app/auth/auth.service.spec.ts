import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configurationService: jest.Mocked<ConfigurationService>;
  let propertyService: jest.Mocked<PropertyService>;
  let module: TestingModule;

  const mockUser = {
    id: 'user-123',
    accessToken: 'hashed-token',
    authChallenge: null,
    createdAt: new Date('2024-01-01'),
    provider: 'GOOGLE' as any,
    role: 'USER' as any,
    thirdPartyId: 'google-123',
    updatedAt: new Date('2024-01-01')
  };

  const mockJwtToken = 'jwt-token-xyz';

  beforeEach(async () => {
    const mockUserService = {
      createAccessToken: jest.fn(),
      users: jest.fn(),
      createUser: jest.fn()
    };

    const mockJwtService = {
      sign: jest.fn()
    };

    const mockConfigurationService = {
      get: jest.fn()
    };

    const mockPropertyService = {
      isUserSignupEnabled: jest.fn()
    };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: ConfigurationService,
          useValue: mockConfigurationService
        },
        {
          provide: PropertyService,
          useValue: mockPropertyService
        }
      ]
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configurationService = module.get(ConfigurationService);
    propertyService = module.get(PropertyService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateAnonymousLogin', () => {
    const accessToken = 'test-access-token';
    const hashedToken = 'hashed-test-token';
    const salt = 'test-salt';

    beforeEach(() => {
      configurationService.get.mockReturnValue(salt);
      userService.createAccessToken.mockReturnValue(hashedToken);
      jwtService.sign.mockReturnValue(mockJwtToken);
    });

    it('should return JWT token when user is found with valid access token', async () => {
      userService.users.mockResolvedValue([mockUser]);

      const result = await authService.validateAnonymousLogin(accessToken);

      expect(result).toBe(mockJwtToken);
      expect(configurationService.get).toHaveBeenCalledWith(
        'ACCESS_TOKEN_SALT'
      );
      expect(userService.createAccessToken).toHaveBeenCalledWith({
        password: accessToken,
        salt
      });
      expect(userService.users).toHaveBeenCalledWith({
        where: { accessToken: hashedToken }
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id
      });
    });

    it('should reject when user is not found', async () => {
      userService.users.mockResolvedValue([]);

      await expect(
        authService.validateAnonymousLogin(accessToken)
      ).rejects.toBeUndefined();
    });

    it('should reject when users query throws error', async () => {
      userService.users.mockRejectedValue(new Error('Database error'));

      await expect(
        authService.validateAnonymousLogin(accessToken)
      ).rejects.toBeUndefined();
    });

    it('should use correct salt from configuration', async () => {
      const customSalt = 'custom-salt-value';
      configurationService.get.mockReturnValue(customSalt);
      userService.users.mockResolvedValue([mockUser]);

      await authService.validateAnonymousLogin(accessToken);

      expect(userService.createAccessToken).toHaveBeenCalledWith({
        password: accessToken,
        salt: customSalt
      });
    });
  });

  describe('validateOAuthLogin', () => {
    const oAuthParams = {
      provider: 'GOOGLE' as any,
      thirdPartyId: 'google-user-123'
    };

    beforeEach(() => {
      jwtService.sign.mockReturnValue(mockJwtToken);
    });

    it('should return JWT token when existing user is found', async () => {
      userService.users.mockResolvedValue([mockUser]);

      const result = await authService.validateOAuthLogin(oAuthParams);

      expect(result).toBe(mockJwtToken);
      expect(userService.users).toHaveBeenCalledWith({
        where: {
          provider: oAuthParams.provider,
          thirdPartyId: oAuthParams.thirdPartyId
        }
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id
      });
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should create new user and return JWT when user not found and signup is enabled', async () => {
      const newUser = { id: 'new-user-123', ...oAuthParams };
      userService.users.mockResolvedValue([]);
      propertyService.isUserSignupEnabled.mockResolvedValue(true);
      userService.createUser.mockResolvedValue(newUser as any);

      const result = await authService.validateOAuthLogin(oAuthParams);

      expect(result).toBe(mockJwtToken);
      expect(propertyService.isUserSignupEnabled).toHaveBeenCalled();
      expect(userService.createUser).toHaveBeenCalledWith({
        data: {
          provider: oAuthParams.provider,
          thirdPartyId: oAuthParams.thirdPartyId
        }
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: newUser.id
      });
    });

    it('should throw InternalServerErrorException when user not found and signup is disabled', async () => {
      userService.users.mockResolvedValue([]);
      propertyService.isUserSignupEnabled.mockResolvedValue(false);

      await expect(authService.validateOAuthLogin(oAuthParams)).rejects.toThrow(
        InternalServerErrorException
      );
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException with error message on failure', async () => {
      const errorMessage = 'Database connection failed';
      userService.users.mockRejectedValue(new Error(errorMessage));

      await expect(authService.validateOAuthLogin(oAuthParams)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should handle different OAuth providers', async () => {
      const githubParams = {
        provider: 'GITHUB' as any,
        thirdPartyId: 'github-user-456'
      };
      const githubUser = { id: 'github-user-id', ...githubParams };
      userService.users.mockResolvedValue([githubUser as any]);

      const result = await authService.validateOAuthLogin(githubParams);

      expect(result).toBe(mockJwtToken);
      expect(userService.users).toHaveBeenCalledWith({
        where: {
          provider: githubParams.provider,
          thirdPartyId: githubParams.thirdPartyId
        }
      });
    });
  });

  describe('JWT token generation', () => {
    it('should generate token with correct user id', async () => {
      const userId = 'test-user-id-123';
      const user = { ...mockUser, id: userId };
      userService.users.mockResolvedValue([user]);
      configurationService.get.mockReturnValue('salt');
      userService.createAccessToken.mockReturnValue('hash');
      jwtService.sign.mockReturnValue(mockJwtToken);

      await authService.validateAnonymousLogin('token');

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: userId
      });
    });
  });
});
