import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { ViewMode } from '@prisma/client';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { SettingsStorageService } from '../services/settings-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private dataService: DataService,
    private router: Router,
    private settingsStorageService: SettingsStorageService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (route.queryParams?.utm_source) {
      this.settingsStorageService.setSetting(
        'utm_source',
        route.queryParams?.utm_source
      );
    }

    return new Promise<boolean>((resolve) => {
      this.dataService
        .fetchUser()
        .pipe(
          catchError(() => {
            if (state.url !== '/start') {
              this.router.navigate(['/start']);
              resolve(false);
              return EMPTY;
            }

            resolve(true);
            return EMPTY;
          })
        )
        .subscribe((user) => {
          if (
            state.url.startsWith('/home') &&
            user.settings.viewMode === ViewMode.ZEN
          ) {
            this.router.navigate(['/zen']);
            resolve(false);
          } else if (state.url.startsWith('/start')) {
            if (user.settings.viewMode === ViewMode.ZEN) {
              this.router.navigate(['/zen']);
            } else {
              this.router.navigate(['/home']);
            }

            resolve(false);
          } else if (
            state.url.startsWith('/zen') &&
            user.settings.viewMode === ViewMode.DEFAULT
          ) {
            this.router.navigate(['/home']);
            resolve(false);
          }

          resolve(true);
        });
    });
  }
}
