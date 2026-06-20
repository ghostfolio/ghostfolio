import { Injectable } from '@angular/core';

import { KEY_TOKEN } from './settings-storage.service';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
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
}
