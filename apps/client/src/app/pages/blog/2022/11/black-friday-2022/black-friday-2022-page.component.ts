import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatButtonModule, RouterModule],
  selector: 'gf-black-friday-2022-page',
  templateUrl: './black-friday-2022-page.html'
})
export class BlackFriday2022PageComponent {
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
}
