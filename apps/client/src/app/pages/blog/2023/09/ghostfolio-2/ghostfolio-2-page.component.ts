import { routes } from '@ghostfolio/common/routes/routes';

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
  public routerLinkBlog = ['/' + routes.blog];
  public routerLinkFeatures = ['/' + routes.features];
  public routerLinkMarkets = ['/' + routes.markets];
}
