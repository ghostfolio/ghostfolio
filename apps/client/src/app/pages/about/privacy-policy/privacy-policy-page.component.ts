import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-privacy-policy-page',
  styleUrls: ['./privacy-policy-page.scss'],
  templateUrl: './privacy-policy-page.html'
})
export class PrivacyPolicyPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
