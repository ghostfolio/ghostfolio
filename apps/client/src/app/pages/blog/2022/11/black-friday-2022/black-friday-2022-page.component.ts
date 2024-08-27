import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatButtonModule, RouterModule],
  selector: 'gf-black-friday-2022-page',
  standalone: true,
  templateUrl: './black-friday-2022-page.html'
})
export class BlackFriday2022PageComponent {
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkPricing = ['/' + $localize`pricing`];
}
