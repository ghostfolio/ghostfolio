import { Service } from '@angular/core';

import { KEY_TOKEN } from './settings-storage.service';

@Service()
export class TokenStorageService {
  public getToken(): string | null {
    return (
      window.sessionStorage.getItem(KEY_TOKEN) ??
      window.localStorage.getItem(KEY_TOKEN)
    );
  }

  public saveToken(token: string, staySignedIn = false) {
    if (staySignedIn) {
      window.localStorage.setItem(KEY_TOKEN, token);
    }

    window.sessionStorage.setItem(KEY_TOKEN, token);
  }
}
