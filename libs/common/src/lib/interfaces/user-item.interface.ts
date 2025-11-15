import { Role } from '@prisma/client';

export interface UserItem {
  accessToken?: string;
  authToken: string;
  role: Role;
}
