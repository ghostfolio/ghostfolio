import type { Role } from '@ghostfolio/prisma/enums';

export interface UserItem {
  accessToken?: string;
  authToken: string;
  role: Role;
}
