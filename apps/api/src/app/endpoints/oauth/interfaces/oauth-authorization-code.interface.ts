export interface OAuthAuthorizationCode {
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  redirectUri: string;
  resource: string;
  scope?: string;
  userId: string;
}
