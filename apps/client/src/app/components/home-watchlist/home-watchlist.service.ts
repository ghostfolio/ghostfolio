import { Service } from '@angular/core';
import { Subject } from 'rxjs';

@Service({ autoProvided: false })
export class HomeWatchlistService {
  private readonly refreshSubject = new Subject<void>();

  public get refresh$() {
    return this.refreshSubject.asObservable();
  }

  public triggerRefresh() {
    this.refreshSubject.next();
  }
}
