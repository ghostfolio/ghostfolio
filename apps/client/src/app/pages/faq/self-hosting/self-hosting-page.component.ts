import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-self-hosting-page',
  styleUrls: ['./self-hosting-page.scss'],
  templateUrl: './self-hosting-page.html',
  standalone: false
})
export class SelfHostingPageComponent implements OnDestroy {
  public pricingUrl = `https://ghostfol.io/${document.documentElement.lang}/${publicRoutes.pricing.path}`;

  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
