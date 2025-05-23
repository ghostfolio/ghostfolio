import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-privacy-policy-page',
  standalone: false,
  styleUrls: ['./privacy-policy-page.scss'],
  templateUrl: './privacy-policy-page.html'
})
export class PrivacyPolicyPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
