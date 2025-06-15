import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-2-page',
  templateUrl: './ghostfolio-2-page.html'
})
export class Ghostfolio2PageComponent {
  public routerLinkAbout = ['/' + routes.about];
  public routerLinkAboutChangelog = ['/' + routes.about, routes.changelog];
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkMarkets = ['/' + routes.markets];
}
