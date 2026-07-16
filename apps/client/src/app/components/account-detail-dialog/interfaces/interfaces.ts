export interface AccountDetailDialogParams {
  accountId: string;
  deviceType: string;
  hasImpersonationId: boolean;
  hasPermissionToCreateActivity: boolean;
}

export interface AccountDetailDialogResult {
  isNavigating?: boolean;
}
