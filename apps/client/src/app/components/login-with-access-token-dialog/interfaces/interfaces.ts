export interface LoginWithAccessTokenDialogParams {
  accessToken: string;
  hasPermissionToUseSocialLogin: boolean;
  socialLoginProviders?: string[];
  title: string;
}
