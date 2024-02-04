import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private shouldReloadSubject = new Subject<void>();

  // Observable stream
  public shouldReload$ = this.shouldReloadSubject.asObservable();

  constructor() {}

  // Method to trigger the reload
  public triggerReload() {
    this.shouldReloadSubject.next();
  }
}
