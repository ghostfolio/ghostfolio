import { Injectable } from '@angular/core';

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  public constructor() {}

  public getToken(): string {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(TOKEN_KEY, token);
  }

  public signOut(): void {
    const utmSource = window.localStorage.getItem('utm_source');

    window.localStorage.clear();

    if (utmSource) {
      window.localStorage.setItem('utm_source', utmSource);
    }
  }
}
