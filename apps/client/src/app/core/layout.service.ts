import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  public shouldReloadContent$: Observable<void>;

  private shouldReloadSubject = new Subject<void>();

  public constructor() {
    this.shouldReloadContent$ = this.shouldReloadSubject.asObservable();
  }

  public getShouldReloadSubject() {
    return this.shouldReloadSubject;
  }
}
