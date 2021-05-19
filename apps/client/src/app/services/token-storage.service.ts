import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private hasTokenChangeSubject = new BehaviorSubject<void>(null);

  public constructor() {}

  public getToken(): string {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  public onChangeHasToken() {
    return this.hasTokenChangeSubject.asObservable();
  }

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(TOKEN_KEY, token);

    this.hasTokenChangeSubject.next();
  }

  public signOut(): void {
    const utmSource = window.localStorage.getItem('utm_source');

    window.localStorage.clear();

    if (utmSource) {
      window.localStorage.setItem('utm_source', utmSource);
    }

    this.hasTokenChangeSubject.next();
  }
}
