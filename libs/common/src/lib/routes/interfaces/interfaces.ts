export interface IRoute {
  excludeFromAssistant?: boolean;
  path: string;
  routerLink: string[];
  subRoutes?: Record<string, IRoute>;
  title: string;
}
