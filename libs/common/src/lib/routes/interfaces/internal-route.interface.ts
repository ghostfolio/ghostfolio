import { User } from '@ghostfolio/common/interfaces';

export interface InternalRoute {
  excludeFromAssistant?: boolean | ((aUser: User) => boolean);
  path: string;
  routerLink: string[];
  subRoutes?: Record<string, InternalRoute>;
  title: string;
}
