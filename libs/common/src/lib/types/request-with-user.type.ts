import { UserWithSettings } from './index';

export type RequestWithUser = Request & { user: UserWithSettings };
