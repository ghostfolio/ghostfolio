import { DataService } from '@ghostfolio/client/services/data.service';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { paths } from '@ghostfolio/common/paths';

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
    `/${paths.about}`,
    `/${paths.blog}`,
    `/${paths.demo}`,
    `/${paths.faq}`,
    `/${paths.features}`,
    `/${paths.markets}`,
    `/${paths.openStartup}`,
    `/${paths.pricing}`,
    `/${paths.public}`,
    `/${paths.register}`,
    `/${paths.resources}`
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
              this.router.navigate(['/' + paths.demo]);
              resolve(false);
            } else if (utmSource === 'trusted-web-activity') {
              this.router.navigate(['/' + paths.register]);
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
              this.router.navigate(['/' + paths.start]);
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
            state.url.startsWith(`/${paths.home}`) &&
            user.settings.viewMode === 'ZEN'
          ) {
            this.router.navigate(['/' + paths.zen]);
            resolve(false);
            return;
          } else if (state.url.startsWith(`/${paths.start}`)) {
            if (user.settings.viewMode === 'ZEN') {
              this.router.navigate(['/' + paths.zen]);
            } else {
              this.router.navigate(['/' + paths.home]);
            }

            resolve(false);
            return;
          } else if (
            state.url.startsWith(`/${paths.zen}`) &&
            user.settings.viewMode === 'DEFAULT'
          ) {
            this.router.navigate(['/' + paths.home]);
            resolve(false);
            return;
          }

          resolve(true);
        });
    });
  }
}
