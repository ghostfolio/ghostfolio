import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatCardModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-self-hosting-page',
  styleUrls: ['./self-hosting-page.scss'],
  templateUrl: './self-hosting-page.html'
})
export class GfSelfHostingPageComponent {
  public pricingUrl = `https://ghostfol.io/${document.documentElement.lang}/${publicRoutes.pricing.path}`;
}
