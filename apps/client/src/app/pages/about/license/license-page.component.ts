import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-license-page',
  styleUrls: ['./license-page.scss'],
  templateUrl: './license-page.html'
})
export class LicensePageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
