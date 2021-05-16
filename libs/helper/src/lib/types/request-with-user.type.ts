import { UserWithSettings } from '@ghostfolio/helper/interfaces';

export type RequestWithUser = Request & { user: UserWithSettings };
