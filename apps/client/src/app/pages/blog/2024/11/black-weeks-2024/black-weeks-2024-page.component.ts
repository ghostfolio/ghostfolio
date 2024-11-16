import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatButtonModule, RouterModule],
  selector: 'gf-black-weeks-2024-page',
  standalone: true,
  templateUrl: './black-weeks-2024-page.html'
})
export class BlackWeeks2024PageComponent {
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
}
