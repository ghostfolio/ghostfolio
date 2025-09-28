import { User } from '../../interfaces/index';

export interface InternalRoute {
  excludeFromAssistant?: boolean | ((aUser: User) => boolean);
  path: string;
  routerLink: string[];
  subRoutes?: Record<string, InternalRoute>;
  title: string;
}
