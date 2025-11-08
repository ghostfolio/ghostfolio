import { AdminUser } from '../admin-user.interface';

export interface AdminUsersResponse {
  count: number;
  users: AdminUser[];
}
