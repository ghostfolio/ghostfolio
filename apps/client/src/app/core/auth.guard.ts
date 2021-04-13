import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
} from '@angular/router';

import { TokenStorageService } from '../services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const isLoggedIn = !!this.tokenStorageService.getToken();

    if (isLoggedIn) {
      if (state.url === '/start') {
        this.router.navigate(['/home']);
        return false;
      }

      return true;
    }

    // Not logged in
    if (state.url !== '/start') {
      this.router.navigate(['/start']);
      return false;
    }

    return true;
  }
}
