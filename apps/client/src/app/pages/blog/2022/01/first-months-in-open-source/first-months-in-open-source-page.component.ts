import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-first-months-in-open-source-page',
  templateUrl: './first-months-in-open-source-page.html'
})
export class FirstMonthsInOpenSourcePageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
}
