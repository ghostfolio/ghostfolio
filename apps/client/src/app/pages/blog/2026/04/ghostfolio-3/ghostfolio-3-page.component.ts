import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-3-page',
  templateUrl: './ghostfolio-3-page.html'
})
export class Ghostfolio3PageComponent {
  public pricingUrl = `https://ghostfol.io/${document.documentElement.lang}/${publicRoutes.pricing.path}`;
  public routerLinkAbout = publicRoutes.about.routerLink;
  public routerLinkAboutChangelog =
    publicRoutes.about.subRoutes.changelog.routerLink;
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkMarkets = publicRoutes.markets.routerLink;
}
