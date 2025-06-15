import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-unlock-your-financial-potential-with-ghostfolio-page',
  templateUrl: './unlock-your-financial-potential-with-ghostfolio-page.html'
})
export class UnlockYourFinancialPotentialWithGhostfolioPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkResources = ['/' + routes.resources];
}
