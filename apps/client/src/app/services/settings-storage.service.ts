import { Injectable } from '@angular/core';

export const KEY_RANGE = 'range';
export const KEY_STAY_SIGNED_IN = 'staySignedIn';
export const KEY_TOKEN = 'auth-token';

@Injectable({
  providedIn: 'root'
})
export class SettingsStorageService {
  public constructor() {}

  public getSetting(aKey: string): string {
    return window.localStorage.getItem(aKey);
  }

  public setSetting(aKey: string, aValue: string) {
    window.localStorage.setItem(aKey, aValue);
  }

  public removeSetting(aKey: string) {
    return window.localStorage.removeItem(aKey);
  }
}
