import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorModule, MatButtonModule, RouterModule],
  selector: 'gf-black-week-2023-page',
  standalone: true,
  templateUrl: './black-week-2023-page.html'
})
export class BlackWeek2023PageComponent {
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkPricing = ['/' + $localize`pricing`];
}
