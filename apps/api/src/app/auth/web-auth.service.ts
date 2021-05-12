import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';

import { UserService } from '../user/user.service';
import {
  generateAssertionOptions,
  GenerateAssertionOptionsOpts,
  generateAttestationOptions,
  GenerateAttestationOptionsOpts,
  VerifiedAssertion,
  VerifiedAttestation,
  verifyAssertionResponse,
  VerifyAssertionResponseOpts,
  verifyAttestationResponse,
  VerifyAttestationResponseOpts
} from '@simplewebauthn/server';
import { REQUEST } from '@nestjs/core';
import { RequestWithUser } from '@ghostfolio/api/app/interfaces/request-with-user.type';
// TODO fix type compilation error
// import { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import base64url from 'base64url';

@Injectable()
export class WebAuthService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly userService: UserService,
    private readonly deviceService: AuthDeviceService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
  ) {}

  get rpName() {
    return this.configurationService.get('WEB_AUTH_RP_NAME');
  }

  get rpID() {
    return this.configurationService.get('WEB_AUTH_RP_ID');
  }

  get expectedOrigin() {
    return this.configurationService.get('ROOT_URL');
  }

  public async generateAttestationOptions() {
    const user = this.request.user;
    const devices = await this.deviceService.authDevices({where: {userId: user.id}});

    const opts: GenerateAttestationOptionsOpts = {
      rpName: this.rpName,
      rpID: this.rpID,
      userID: user.id,
      userName: user.alias,
      timeout: 60000,
      attestationType: 'indirect',
      /**
       * Passing in a user's list of already-registered authenticator IDs here prevents users from
       * registering the same device multiple times. The authenticator will simply throw an error in
       * the browser if it's asked to perform an attestation when one of these ID's already resides
       * on it.
       */
      excludeCredentials: devices.map(device => ({
        id: device.credentialId,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal'],
      })),
      /**
       * The optional authenticatorSelection property allows for specifying more constraints around
       * the types of authenticators that users to can use for attestation
       */
      authenticatorSelection: {
        userVerification: 'preferred',
        requireResidentKey: false,
      },
    };

    const options = generateAttestationOptions(opts);

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    await this.userService.updateUser({
      data: {
        authChallenge: options.challenge,
      },
      where: {
        id: user.id,
      }
    })

    return options;
  }

  public async verifyAttestation(body: any){

    const user = this.request.user;
    const expectedChallenge = user.authChallenge;

    let verification: VerifiedAttestation;
    try {
      const opts: VerifyAttestationResponseOpts = {
        credential: body,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
      };
      verification = await verifyAttestationResponse(opts);
    } catch (error) {
      console.error(error);
      return new InternalServerErrorException(error.message);
    }

    const { verified, attestationInfo } = verification;

    const devices = await this.deviceService.authDevices({where: {userId: user.id}});
    if (verified && attestationInfo) {
      const { credentialPublicKey, credentialID, counter } = attestationInfo;

      const existingDevice = devices.find(device => device.credentialId === credentialID);

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        await this.deviceService.createAuthDevice({
          credentialPublicKey,
          credentialId: credentialID,
          counter,
          name: body.deviceName,
          User: { connect: { id: user.id } }
        })
      }
    }

    return { verified };
  }

  public async generateAssertionOptions(){
    const user = this.request.user;
    const devices = await this.deviceService.authDevices({where: {userId: user.id}});

    const opts: GenerateAssertionOptionsOpts = {
      timeout: 60000,
      allowCredentials: devices.map(dev => ({
        id: dev.credentialId,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal'],
      })),
      /**
       * This optional value controls whether or not the authenticator needs be able to uniquely
       * identify the user interacting with it (via built-in PIN pad, fingerprint scanner, etc...)
       */
      userVerification: 'preferred',
      rpID: this.rpID,
    };

    const options = generateAssertionOptions(opts);

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    await this.userService.updateUser({
      data: {
        authChallenge: options.challenge,
      },
      where: {
        id: user.id,
      }
    })

    return options;
  }

  public async verifyAssertion(body: any){

    const user = this.request.user;

    const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
    const devices = await this.deviceService.authDevices({where: {credentialId: bodyCredIDBuffer}});

    if (devices.length !== 1) {
      throw new InternalServerErrorException(`Could not find authenticator matching ${body.id}`);
    }
    const authenticator = devices[0];

    let verification: VerifiedAssertion;
    try {
      const opts: VerifyAssertionResponseOpts = {
        credential: body,
        expectedChallenge: `${user.authChallenge}`,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: authenticator.credentialId,
          credentialPublicKey: authenticator.credentialPublicKey,
          counter: authenticator.counter,
        },
      };
      verification = verifyAssertionResponse(opts);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException({ error: error.message });
    }

    const { verified, assertionInfo } = verification;

    if (verified) {
      // Update the authenticator's counter in the DB to the newest count in the assertion
      authenticator.counter = assertionInfo.newCounter;

      await this.deviceService.updateAuthDevice({
        data: authenticator,
        where: {id_userId: { id: authenticator.id, userId: user.id}}
      })
    }

    return { verified };
  }
}
