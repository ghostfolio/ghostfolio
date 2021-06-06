import { Injectable } from '@angular/core';

import { UserService } from './user/user.service';

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  public constructor(private userService: UserService) {}

  public getToken(): string {
    return window.sessionStorage.getItem(TOKEN_KEY);
  }

  public saveToken(token: string): void {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }

  public signOut(): void {
    const utmSource = window.sessionStorage.getItem('utm_source');

    window.sessionStorage.clear();

    this.userService.remove();

    if (utmSource) {
      window.sessionStorage.setItem('utm_source', utmSource);
    }
  }
}
