import { paths } from '@ghostfolio/client/core/paths';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatButtonModule, RouterModule],
  selector: 'gf-black-week-2023-page',
  templateUrl: './black-week-2023-page.html'
})
export class BlackWeek2023PageComponent {
  public routerLinkFeatures = ['/' + paths.features];
  public routerLinkPricing = ['/' + paths.pricing];
}
