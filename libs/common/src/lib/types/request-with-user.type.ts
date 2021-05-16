import { UserWithSettings } from '@ghostfolio/common/interfaces';

export type RequestWithUser = Request & { user: UserWithSettings };
