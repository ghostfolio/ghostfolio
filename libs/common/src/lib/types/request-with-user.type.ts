import { UserWithSettings } from '@ghostfolio/common/types';

export type RequestWithUser = Request & { user: UserWithSettings };
