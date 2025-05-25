import { paths } from '@ghostfolio/common/paths';

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
  public routerLinkAbout = ['/' + paths.about];
  public routerLinkAboutChangelog = ['/' + paths.about, paths.changelog];
  public routerLinkBlog = ['/' + paths.blog];
  public routerLinkFeatures = ['/' + paths.features];
  public routerLinkMarkets = ['/' + paths.markets];
}
