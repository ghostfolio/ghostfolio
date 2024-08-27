import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
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
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server';

import {
  AssertionCredentialJSON,
  AttestationCredentialJSON
} from './interfaces/simplewebauthn';

@Injectable()
export class WebAuthService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deviceService: AuthDeviceService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  get rpID() {
    return new URL(this.configurationService.get('ROOT_URL')).hostname;
  }

  get expectedOrigin() {
    return this.configurationService.get('ROOT_URL');
  }

  public async generateRegistrationOptions() {
    const user = this.request.user;

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: 'Ghostfolio',
      rpID: this.rpID,
      userID: user.id,
      userName: '',
      timeout: 60000,
      attestationType: 'indirect',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required'
      }
    };

    const options = await generateRegistrationOptions(opts);

    await this.userService.updateUser({
      data: {
        authChallenge: options.challenge
      },
      where: {
        id: user.id
      }
    });

    return options;
  }

  public async verifyAttestation(
    deviceName: string,
    credential: AttestationCredentialJSON
  ): Promise<AuthDeviceDto> {
    const user = this.request.user;
    const expectedChallenge = user.authChallenge;

    let verification: VerifiedRegistrationResponse;
    try {
      const opts: VerifyRegistrationResponseOpts = {
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
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
      Logger.error(error, 'WebAuthService');
      throw new InternalServerErrorException(error.message);
    }

    const { registrationInfo, verified } = verification;

    const devices = await this.deviceService.authDevices({
      where: { userId: user.id }
    });
    if (registrationInfo && verified) {
      const { counter, credentialID, credentialPublicKey } = registrationInfo;

      let existingDevice = devices.find(
        (device) => device.credentialId === credentialID
      );

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        existingDevice = await this.deviceService.createAuthDevice({
          counter,
          credentialId: Buffer.from(credentialID),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          User: { connect: { id: user.id } }
        });
      }

      return {
        createdAt: existingDevice.createdAt.toISOString(),
        id: existingDevice.id
      };
    }

    throw new InternalServerErrorException('An unknown error occurred');
  }

  public async generateAssertionOptions(deviceId: string) {
    const device = await this.deviceService.authDevice({ id: deviceId });

    if (!device) {
      throw new Error('Device not found');
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      allowCredentials: [
        {
          id: device.credentialId,
          transports: ['internal'],
          type: 'public-key'
        }
      ],
      rpID: this.rpID,
      timeout: 60000,
      userVerification: 'preferred'
    };

    const options = await generateAuthenticationOptions(opts);

    await this.userService.updateUser({
      data: {
        authChallenge: options.challenge
      },
      where: {
        id: device.userId
      }
    });

    return options;
  }

  public async verifyAssertion(
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
        authenticator: {
          credentialID: device.credentialId,
          credentialPublicKey: device.credentialPublicKey,
          counter: device.counter
        },
        expectedChallenge: `${user.authChallenge}`,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
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
      Logger.error(error, 'WebAuthService');
      throw new InternalServerErrorException({ error: error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      device.counter = authenticationInfo.newCounter;

      await this.deviceService.updateAuthDevice({
        data: device,
        where: { id: device.id }
      });

      return this.jwtService.sign({
        id: user.id
      });
    }

    throw new Error();
  }
}
