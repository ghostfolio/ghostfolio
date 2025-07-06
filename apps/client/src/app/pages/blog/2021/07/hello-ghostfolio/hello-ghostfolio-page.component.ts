import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hello-ghostfolio-page',
  templateUrl: './hello-ghostfolio-page.html'
})
export class HelloGhostfolioPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
  public routerLinkResources = publicRoutes.resources.routerLink;
}
