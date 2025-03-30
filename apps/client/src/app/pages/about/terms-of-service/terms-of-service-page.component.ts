import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-terms-of-service-page',
  standalone: false,
  styleUrls: ['./terms-of-service-page.scss'],
  templateUrl: './terms-of-service-page.html'
})
export class TermsOfServicePageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
