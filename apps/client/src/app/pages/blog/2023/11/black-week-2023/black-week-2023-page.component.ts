import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfPremiumIndicatorComponent, MatButtonModule, RouterModule],
  selector: 'gf-black-week-2023-page',
  templateUrl: './black-week-2023-page.html'
})
export class BlackWeek2023PageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
}
