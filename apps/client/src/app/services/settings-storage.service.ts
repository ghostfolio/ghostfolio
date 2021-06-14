import { Injectable } from '@angular/core';

export const RANGE = 'range';

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

  public removeSetting(aKey: string): void {
    return window.localStorage.removeItem(aKey);
  }
}
