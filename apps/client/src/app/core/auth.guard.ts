import { DataService } from '@ghostfolio/client/services/data.service';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';

import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  private static PUBLIC_PAGE_ROUTES = [
    `/${publicRoutes.about.path}`,
    `/${publicRoutes.blog.path}`,
    `/${publicRoutes.demo.path}`,
    `/${publicRoutes.faq.path}`,
    `/${publicRoutes.features.path}`,
    `/${publicRoutes.markets.path}`,
    `/${publicRoutes.openStartup.path}`,
    `/${publicRoutes.pricing.path}`,
    `/${publicRoutes.public.path}`,
    `/${publicRoutes.register.path}`,
    `/${publicRoutes.resources.path}`
  ];

  public constructor(
    private dataService: DataService,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private userService: UserService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const utmSource = route.queryParams?.utm_source;

    if (utmSource) {
      this.settingsStorageService.setSetting('utm_source', utmSource);
    }

    return new Promise<boolean>((resolve) => {
      this.userService
        .get()
        .pipe(
          catchError(() => {
            if (utmSource === 'ios') {
              this.router.navigate(publicRoutes.demo.routerLink);
              resolve(false);
            } else if (utmSource === 'trusted-web-activity') {
              this.router.navigate(publicRoutes.register.routerLink);
              resolve(false);
            } else if (
              AuthGuard.PUBLIC_PAGE_ROUTES.some((publicPageRoute) => {
                const [, url] = decodeURIComponent(state.url).split('/');
                return `/${url}` === publicPageRoute;
              })
            ) {
              resolve(true);
              return EMPTY;
            } else if (state.url !== '/start') {
              this.router.navigate(publicRoutes.start.routerLink);
              resolve(false);
              return EMPTY;
            }

            resolve(true);
            return EMPTY;
          })
        )
        .subscribe((user) => {
          const userLanguage = user?.settings?.language;

          if (userLanguage && document.documentElement.lang !== userLanguage) {
            this.dataService
              .putUserSetting({ language: document.documentElement.lang })
              .subscribe(() => {
                this.userService.remove();

                setTimeout(() => {
                  window.location.reload();
                }, 300);
              });

            resolve(true);
            return;
          } else if (
            state.url.startsWith(`/${internalRoutes.home.path}`) &&
            user.settings.viewMode === 'ZEN'
          ) {
            this.router.navigate(internalRoutes.zen.routerLink);
            resolve(false);
            return;
          } else if (state.url.startsWith(`/${publicRoutes.start.path}`)) {
            if (user.settings.viewMode === 'ZEN') {
              this.router.navigate(internalRoutes.zen.routerLink);
            } else {
              this.router.navigate(internalRoutes.home.routerLink);
            }

            resolve(false);
            return;
          } else if (
            state.url.startsWith(`/${internalRoutes.zen.path}`) &&
            user.settings.viewMode === 'DEFAULT'
          ) {
            this.router.navigate(internalRoutes.home.routerLink);
            resolve(false);
            return;
          }

          resolve(true);
        });
    });
  }
}
