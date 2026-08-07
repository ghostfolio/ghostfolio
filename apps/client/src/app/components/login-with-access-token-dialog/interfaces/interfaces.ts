export interface LoginWithAccessTokenDialogParams {
  accessToken: string;
  hasPermissionToUseAuthGoogle: boolean;
  hasPermissionToUseAuthOidc: boolean;
  hasPermissionToUseAuthToken: boolean;
  title: string;
}

export interface LoginWithAccessTokenDialogResult {
  accessToken: string | null;
}
