import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TOKEN_KEY = 'auth-token';
// const USER_KEY = 'auth-user';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private hasTokenChangeSubject = new BehaviorSubject<void>(null);

  public constructor() {}

  public signOut(): void {
    window.localStorage.clear();

    this.hasTokenChangeSubject.next();
  }

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(TOKEN_KEY, token);

    this.hasTokenChangeSubject.next();
  }

  public getToken(): string {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  public onChangeHasToken() {
    return this.hasTokenChangeSubject.asObservable();
  }

  /*public saveUser(user): void {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public getUser(): any {
    return JSON.parse(localStorage.getItem(USER_KEY));
  }*/
}
