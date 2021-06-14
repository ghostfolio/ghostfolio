export interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
  readonly authenticatorData: ArrayBuffer;
  readonly signature: ArrayBuffer;
  readonly userHandle: ArrayBuffer | null;
}
export interface AuthenticatorAttestationResponse
  extends AuthenticatorResponse {
  readonly attestationObject: ArrayBuffer;
}
export interface AuthenticationExtensionsClientInputs {
  appid?: string;
  appidExclude?: string;
  credProps?: boolean;
  uvm?: boolean;
}
export interface AuthenticationExtensionsClientOutputs {
  appid?: boolean;
  credProps?: CredentialPropertiesOutput;
  uvm?: UvmEntries;
}
export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
}
export interface PublicKeyCredential extends Credential {
  readonly rawId: ArrayBuffer;
  readonly response: AuthenticatorResponse;
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}
export interface PublicKeyCredentialCreationOptions {
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  challenge: BufferSource;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  extensions?: AuthenticationExtensionsClientInputs;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  rp: PublicKeyCredentialRpEntity;
  timeout?: number;
  user: PublicKeyCredentialUserEntity;
}
export interface PublicKeyCredentialDescriptor {
  id: BufferSource;
  transports?: AuthenticatorTransport[];
  type: PublicKeyCredentialType;
}
export interface PublicKeyCredentialParameters {
  alg: COSEAlgorithmIdentifier;
  type: PublicKeyCredentialType;
}
export interface PublicKeyCredentialRequestOptions {
  allowCredentials?: PublicKeyCredentialDescriptor[];
  challenge: BufferSource;
  extensions?: AuthenticationExtensionsClientInputs;
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}
export interface PublicKeyCredentialUserEntity
  extends PublicKeyCredentialEntity {
  displayName: string;
  id: BufferSource;
}
export interface AuthenticatorResponse {
  readonly clientDataJSON: ArrayBuffer;
}
export interface CredentialPropertiesOutput {
  rk?: boolean;
}
export interface Credential {
  readonly id: string;
  readonly type: string;
}
export interface PublicKeyCredentialRpEntity extends PublicKeyCredentialEntity {
  id?: string;
}
export interface PublicKeyCredentialEntity {
  name: string;
}
export declare type AttestationConveyancePreference =
  | 'direct'
  | 'enterprise'
  | 'indirect'
  | 'none';
export declare type AuthenticatorTransport = 'ble' | 'internal' | 'nfc' | 'usb';
export declare type COSEAlgorithmIdentifier = number;
export declare type UserVerificationRequirement =
  | 'discouraged'
  | 'preferred'
  | 'required';
export declare type UvmEntries = UvmEntry[];
export declare type AuthenticatorAttachment = 'cross-platform' | 'platform';
export declare type ResidentKeyRequirement =
  | 'discouraged'
  | 'preferred'
  | 'required';
export declare type BufferSource = ArrayBufferView | ArrayBuffer;
export declare type PublicKeyCredentialType = 'public-key';
export declare type UvmEntry = number[];

export interface PublicKeyCredentialCreationOptionsJSON
  extends Omit<
    PublicKeyCredentialCreationOptions,
    'challenge' | 'user' | 'excludeCredentials'
  > {
  user: PublicKeyCredentialUserEntityJSON;
  challenge: Base64URLString;
  excludeCredentials: PublicKeyCredentialDescriptorJSON[];
  extensions?: AuthenticationExtensionsClientInputs;
}
/**
 * A variant of PublicKeyCredentialRequestOptions suitable for JSON transmission to the browser to
 * (eventually) get passed into navigator.credentials.get(...) in the browser.
 */
export interface PublicKeyCredentialRequestOptionsJSON
  extends Omit<
    PublicKeyCredentialRequestOptions,
    'challenge' | 'allowCredentials'
  > {
  challenge: Base64URLString;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[];
  extensions?: AuthenticationExtensionsClientInputs;
}
export interface PublicKeyCredentialDescriptorJSON
  extends Omit<PublicKeyCredentialDescriptor, 'id'> {
  id: Base64URLString;
}
export interface PublicKeyCredentialUserEntityJSON
  extends Omit<PublicKeyCredentialUserEntity, 'id'> {
  id: string;
}
/**
 * The value returned from navigator.credentials.create()
 */
export interface AttestationCredential extends PublicKeyCredential {
  response: AuthenticatorAttestationResponseFuture;
}
/**
 * A slightly-modified AttestationCredential to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 */
export interface AttestationCredentialJSON
  extends Omit<
    AttestationCredential,
    'response' | 'rawId' | 'getClientExtensionResults'
  > {
  rawId: Base64URLString;
  response: AuthenticatorAttestationResponseJSON;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  transports?: AuthenticatorTransport[];
}
/**
 * The value returned from navigator.credentials.get()
 */
export interface AssertionCredential extends PublicKeyCredential {
  response: AuthenticatorAssertionResponse;
}
/**
 * A slightly-modified AssertionCredential to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 */
export interface AssertionCredentialJSON
  extends Omit<
    AssertionCredential,
    'response' | 'rawId' | 'getClientExtensionResults'
  > {
  rawId: Base64URLString;
  response: AuthenticatorAssertionResponseJSON;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}
/**
 * A slightly-modified AuthenticatorAttestationResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 */
export interface AuthenticatorAttestationResponseJSON
  extends Omit<
    AuthenticatorAttestationResponseFuture,
    'clientDataJSON' | 'attestationObject'
  > {
  clientDataJSON: Base64URLString;
  attestationObject: Base64URLString;
}
/**
 * A slightly-modified AuthenticatorAssertionResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 */
export interface AuthenticatorAssertionResponseJSON
  extends Omit<
    AuthenticatorAssertionResponse,
    'authenticatorData' | 'clientDataJSON' | 'signature' | 'userHandle'
  > {
  authenticatorData: Base64URLString;
  clientDataJSON: Base64URLString;
  signature: Base64URLString;
  userHandle?: string;
}
/**
 * A WebAuthn-compatible device and the information needed to verify assertions by it
 */
export declare type AuthenticatorDevice = {
  credentialPublicKey: Buffer;
  credentialID: Buffer;
  counter: number;
  transports?: AuthenticatorTransport[];
};
/**
 * An attempt to communicate that this isn't just any string, but a Base64URL-encoded string
 */
export declare type Base64URLString = string;
/**
 * AuthenticatorAttestationResponse in TypeScript's DOM lib is outdated (up through v3.9.7).
 * Maintain an augmented version here so we can implement additional properties as the WebAuthn
 * spec evolves.
 *
 * See https://www.w3.org/TR/webauthn-2/#iface-authenticatorattestationresponse
 *
 * Properties marked optional are not supported in all browsers.
 */
export interface AuthenticatorAttestationResponseFuture
  extends AuthenticatorAttestationResponse {
  getTransports?: () => AuthenticatorTransport[];
  getAuthenticatorData?: () => ArrayBuffer;
  getPublicKey?: () => ArrayBuffer;
  getPublicKeyAlgorithm?: () => COSEAlgorithmIdentifier[];
}
