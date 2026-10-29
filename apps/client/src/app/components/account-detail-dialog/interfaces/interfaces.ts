export interface AccountDetailDialogParams {
  accountId: string;
  deviceType: string;
  hasPermissionToCreateActivity: boolean;
  hasPermissionToUpdateActivity: boolean;
  impersonationId: string | null;
}

export interface AccountDetailDialogResult {
  isNavigating?: boolean;
}
