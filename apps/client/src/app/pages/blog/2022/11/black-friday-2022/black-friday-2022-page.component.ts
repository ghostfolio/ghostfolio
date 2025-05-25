import { paths } from '@ghostfolio/common/paths';
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
  public routerLinkBlog = ['/' + paths.blog];
  public routerLinkFeatures = ['/' + paths.features];
  public routerLinkPricing = ['/' + paths.pricing];
}
