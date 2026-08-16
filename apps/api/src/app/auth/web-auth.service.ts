import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import {
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';
import { AuthDeviceDto } from '@ghostfolio/common/dtos';
import {
  AssertionCredentialJSON,
  AttestationCredentialJSON
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
  generateRegistrationOptions,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
  verifyRegistrationResponse,
  VerifyRegistrationResponseOpts
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import { isPast } from 'date-fns';
import ms from 'ms';

@Injectable()
export class WebAuthService {
  private readonly logger = new Logger(WebAuthService.name);

  public constructor(
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly deviceService: AuthDeviceService,
    private readonly jwtService: JwtService,
    private readonly portfolioSnapshotService: PortfolioSnapshotService,
    private readonly redisCacheService: RedisCacheService,
    private readonly userService: UserService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  private get expectedOrigin() {
    return this.configurationService.get('ROOT_URL');
  }

  private get rpID() {
    return new URL(this.configurationService.get('ROOT_URL')).hostname;
  }

  public async generateRegistrationOptions() {
    const user = this.request.user;

    const opts: GenerateRegistrationOptionsOpts = {
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'preferred'
      },
      rpID: this.rpID,
      rpName: 'Ghostfolio',
      timeout: ms('60 seconds'),
      userID: isoUint8Array.fromUTF8String(user.id),
      userName: ''
    };

    const registrationOptions = await generateRegistrationOptions(opts);

    await this.userService.updateUser({
      data: {
        authChallenge: registrationOptions.challenge
      },
      where: {
        id: user.id
      }
    });

    return registrationOptions;
  }

  public async verifyAttestation(
    credential: AttestationCredentialJSON
  ): Promise<AuthDeviceDto> {
    const user = this.request.user;
    const expectedChallenge = user.authChallenge;

    if (!expectedChallenge) {
      throw new Error('Missing authentication challenge');
    }

    let verification: VerifiedRegistrationResponse;

    try {
      const opts: VerifyRegistrationResponseOpts = {
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
        response: {
          clientExtensionResults: credential.clientExtensionResults,
          id: credential.id,
          rawId: credential.rawId,
          response: credential.response,
          type: 'public-key'
        }
      };

      verification = await verifyRegistrationResponse(opts);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }

    const { registrationInfo, verified } = verification;

    const devices = await this.deviceService.authDevices({
      where: { userId: user.id }
    });
    if (registrationInfo && verified) {
      const {
        credential: {
          counter,
          id: credentialId,
          publicKey: credentialPublicKey
        }
      } = registrationInfo;

      let existingDevice = devices.find((device) => {
        return isoBase64URL.fromBuffer(device.credentialId) === credentialId;
      });

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        existingDevice = await this.deviceService.createAuthDevice({
          counter,
          credentialId: Buffer.from(credentialId),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          user: { connect: { id: user.id } }
        });
      }

      return {
        createdAt: existingDevice.createdAt.toISOString(),
        id: existingDevice.id
      };
    }

    throw new InternalServerErrorException('An unknown error occurred');
  }

  public async generateAuthenticationOptions(deviceId: string) {
    const device = await this.deviceService.authDevice({ id: deviceId });

    if (!device) {
      throw new Error('Device not found');
    }

    // Compute in the background during the biometric authentication
    void this.warmUpPortfolioSnapshot({ userId: device.userId });

    const opts: GenerateAuthenticationOptionsOpts = {
      allowCredentials: [],
      rpID: this.rpID,
      timeout: ms('60 seconds'),
      userVerification: 'preferred'
    };

    const authenticationOptions = await generateAuthenticationOptions(opts);

    await this.userService.updateUser({
      data: {
        authChallenge: authenticationOptions.challenge
      },
      where: {
        id: device.userId
      }
    });

    return authenticationOptions;
  }

  public async verifyAuthentication(
    deviceId: string,
    credential: AssertionCredentialJSON
  ) {
    const device = await this.deviceService.authDevice({ id: deviceId });

    if (!device) {
      throw new Error('Device not found');
    }

    const user = await this.userService.user({ id: device.userId });

    let verification: VerifiedAuthenticationResponse;

    try {
      const opts: VerifyAuthenticationResponseOpts = {
        credential: {
          counter: device.counter,
          id: isoBase64URL.fromBuffer(device.credentialId),
          publicKey: device.credentialPublicKey
        },
        expectedChallenge: `${user?.authChallenge}`,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
        response: {
          clientExtensionResults: credential.clientExtensionResults,
          id: credential.id,
          rawId: credential.rawId,
          response: credential.response,
          type: 'public-key'
        }
      };

      verification = await verifyAuthenticationResponse(opts);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException({ error: error.message });
    }

    const { authenticationInfo, verified } = verification;

    if (verified) {
      device.counter = authenticationInfo.newCounter;

      await this.deviceService.updateAuthDevice({
        data: device,
        where: { id: device.id }
      });

      return this.jwtService.sign({
        id: user?.id
      });
    }

    throw new Error();
  }

  private async isPortfolioSnapshotExpired(portfolioSnapshotKey: string) {
    try {
      const { expiration }: PortfolioSnapshotValue = JSON.parse(
        await this.redisCacheService.get(portfolioSnapshotKey)
      );

      return isPast(new Date(expiration));
    } catch {
      return true;
    }
  }

  private async warmUpPortfolioSnapshot({ userId }: { userId: string }) {
    try {
      const user = await this.userService.user({ id: userId });

      if (!user) {
        return;
      }

      const userSettings = user.settings.settings;

      const filters = this.apiService.buildFiltersFromUserSettings({
        userSettings
      });

      const portfolioSnapshotKey =
        this.redisCacheService.getPortfolioSnapshotKey({ filters, userId });

      if (await this.isPortfolioSnapshotExpired(portfolioSnapshotKey)) {
        await this.portfolioSnapshotService.addJobToQueue({
          data: {
            filters,
            userId,
            calculationType: userSettings.performanceCalculationType,
            userCurrency: userSettings.baseCurrency
          },
          name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
          opts: {
            ...PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
            jobId: portfolioSnapshotKey,
            priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `Portfolio snapshot of user '${userId}' could not be warmed up`,
        error
      );
    }
  }
}
