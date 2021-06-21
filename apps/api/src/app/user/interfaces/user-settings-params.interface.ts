import { Currency, ViewMode } from '@prisma/client';

export interface UserSettingsParams {
  currency?: Currency;
  userId: string;
  viewMode?: ViewMode;
}
