import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { RequestWithUser } from '@ghostfolio/common/types';
import {
  Inject,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  GenerateAssertionOptionsOpts,
  GenerateAttestationOptionsOpts,
  VerifiedAssertion,
  VerifiedAttestation,
  VerifyAssertionResponseOpts,
  VerifyAttestationResponseOpts,
  generateAssertionOptions,
  generateAttestationOptions,
  verifyAssertionResponse,
  verifyAttestationResponse
} from '@simplewebauthn/server';

import { UserService } from '../user/user.service';
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
    return this.configurationService.get('WEB_AUTH_RP_ID');
  }

  get expectedOrigin() {
    return this.configurationService.get('ROOT_URL');
  }

  public async generateAttestationOptions() {
    const user = this.request.user;

    const opts: GenerateAttestationOptionsOpts = {
      rpName: 'Ghostfolio',
      rpID: this.rpID,
      userID: user.id,
      userName: user.alias,
      timeout: 60000,
      attestationType: 'indirect',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required'
      }
    };

    const options = generateAttestationOptions(opts);

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

    let verification: VerifiedAttestation;
    try {
      const opts: VerifyAttestationResponseOpts = {
        credential,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID
      };
      verification = await verifyAttestationResponse(opts);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(error.message);
    }

    const { verified, attestationInfo } = verification;

    const devices = await this.deviceService.authDevices({
      where: { userId: user.id }
    });
    if (verified && attestationInfo) {
      const { credentialPublicKey, credentialID, counter } = attestationInfo;

      let existingDevice = devices.find(
        (device) => device.credentialId === credentialID
      );

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        existingDevice = await this.deviceService.createAuthDevice({
          credentialPublicKey,
          credentialId: credentialID,
          counter,
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

    const opts: GenerateAssertionOptionsOpts = {
      timeout: 60000,
      allowCredentials: [
        {
          id: device.credentialId,
          type: 'public-key',
          transports: ['internal']
        }
      ],
      userVerification: 'preferred',
      rpID: this.rpID
    };

    const options = generateAssertionOptions(opts);

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

    let verification: VerifiedAssertion;
    try {
      const opts: VerifyAssertionResponseOpts = {
        credential,
        expectedChallenge: `${user.authChallenge}`,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: device.credentialId,
          credentialPublicKey: device.credentialPublicKey,
          counter: device.counter
        }
      };
      verification = verifyAssertionResponse(opts);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException({ error: error.message });
    }

    const { verified, assertionInfo } = verification;

    if (verified) {
      device.counter = assertionInfo.newCounter;

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
