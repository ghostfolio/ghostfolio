export interface LoginWithAccessTokenDialogParams {
  accessToken: string;
  hasPermissionToUseSocialLogin: boolean;
  isAccessTokenLoginEnabled?: boolean;
  socialLoginProviders?: string[];
  title: string;
}
