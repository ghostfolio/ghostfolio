export interface PublicRoute {
  excludeFromSitemap?: boolean;
  path: string;
  routerLink: string[];
  subRoutes?: Record<string, PublicRoute>;
  title?: string;
}
