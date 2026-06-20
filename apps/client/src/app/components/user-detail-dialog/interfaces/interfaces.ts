export interface UserDetailDialogParams {
  currentUserId: string;
  deviceType: string;
  hasPermissionForSubscription: boolean;
  locale: string;
  userId: string;
}

export interface UserDetailDialogResult {
  action: 'delete';
  userId: string;
}
