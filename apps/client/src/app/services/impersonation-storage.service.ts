import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export const IMPERSONATION_KEY = 'impersonationId';

@Injectable({
  providedIn: 'root'
})
export class ImpersonationStorageService {
  private hasImpersonationChangeSubject = new BehaviorSubject<string>(
    this.getId()
  );

  public constructor() {}

  public getId(): string {
    return window.localStorage.getItem(IMPERSONATION_KEY);
  }

  public onChangeHasImpersonation() {
    return this.hasImpersonationChangeSubject.asObservable();
  }

  public removeId() {
    window.localStorage.removeItem(IMPERSONATION_KEY);

    this.hasImpersonationChangeSubject.next(null);
  }

  public setId(aId: string) {
    window.localStorage.setItem(IMPERSONATION_KEY, aId);

    this.hasImpersonationChangeSubject.next(aId);
  }
}
