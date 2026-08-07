export interface AccountDetailDialogParams {
  accountId: string;
  deviceType: string;
  hasPermissionToCreateActivity: boolean;
  impersonationId: string | null;
}

export interface AccountDetailDialogResult {
  isNavigating?: boolean;
}
