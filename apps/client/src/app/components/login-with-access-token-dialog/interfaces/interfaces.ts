export interface LoginWithAccessTokenDialogParams {
  accessToken: string;
  hasPermissionToUseAuthGoogle: boolean;
  hasPermissionToUseAuthOidc: boolean;
  hasPermissionToUseAuthToken: boolean;
  title: string;
}
