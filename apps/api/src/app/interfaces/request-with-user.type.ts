import { UserWithSettings } from './user-with-settings';

export type RequestWithUser = Request & { user: UserWithSettings };
