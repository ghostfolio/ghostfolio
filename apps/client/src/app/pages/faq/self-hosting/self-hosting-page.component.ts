import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatCardModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-self-hosting-page',
  styleUrls: ['./self-hosting-page.scss'],
  templateUrl: './self-hosting-page.html'
})
export class SelfHostingPageComponent implements OnDestroy {
  public pricingUrl = `https://ghostfol.io/${document.documentElement.lang}/${publicRoutes.pricing.path}`;

  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
