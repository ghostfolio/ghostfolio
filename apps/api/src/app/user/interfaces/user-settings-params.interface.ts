import { ViewMode } from '@prisma/client';

export interface UserSettingsParams {
  currency?: string;
  userId: string;
  viewMode?: ViewMode;
}
