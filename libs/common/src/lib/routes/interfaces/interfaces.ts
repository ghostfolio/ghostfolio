import { User } from '@ghostfolio/common/interfaces';

export interface IRoute {
  excludeFromAssistant?: boolean | ((aUser: User) => boolean);
  path: string;
  routerLink: string[];
  subRoutes?: Record<string, IRoute>;
  title: string;
}
