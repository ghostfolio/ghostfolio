import { AccessWithGranteeUser } from './access-with-grantee-user.type';
import { UserWithSettings } from './user-with-settings.type';

export type UserWithApiAccess = UserWithSettings & {
  apiAccess: AccessWithGranteeUser;
};
