import { Account, Settings, User } from '@prisma/client';

export type UserWithSettings = User & {
  Account: Account[];
  Settings: Settings;
};
