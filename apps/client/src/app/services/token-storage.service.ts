import { Injectable } from '@angular/core';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

import { UserService } from './user/user.service';

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  public constructor(
    private userService: UserService,
    private webAuthnService: WebAuthnService
  ) {}

  public getToken(): string {
    return (
      window.sessionStorage.getItem(TOKEN_KEY) ||
      window.localStorage.getItem(TOKEN_KEY)
    );
  }

  public saveToken(token: string, staySignedIn: boolean = false): void {
    if (staySignedIn) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }

  public signOut(): void {
    const utmSource = window.localStorage.getItem('utm_source');

    if (this.webAuthnService.isEnabled()) {
      this.webAuthnService.deregister().subscribe();
    }

    window.localStorage.clear();
    window.sessionStorage.clear();

    this.userService.remove();

    if (utmSource) {
      window.localStorage.setItem('utm_source', utmSource);
    }
  }
}
