import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

import { Injectable } from '@angular/core';

import { KEY_TOKEN } from './settings-storage.service';
import { UserService } from './user/user.service';

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
      window.sessionStorage.getItem(KEY_TOKEN) ||
      window.localStorage.getItem(KEY_TOKEN)
    );
  }

  public saveToken(token: string, staySignedIn = false) {
    if (staySignedIn) {
      window.localStorage.setItem(KEY_TOKEN, token);
    }
    window.sessionStorage.setItem(KEY_TOKEN, token);
  }

  public signOut() {
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
