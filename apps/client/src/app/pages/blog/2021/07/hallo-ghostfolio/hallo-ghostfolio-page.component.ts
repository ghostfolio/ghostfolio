import { paths } from '@ghostfolio/common/paths';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hallo-ghostfolio-page',
  templateUrl: './hallo-ghostfolio-page.html'
})
export class HalloGhostfolioPageComponent {
  public routerLinkBlog = ['/' + paths.blog];
  public routerLinkPricing = ['/' + paths.pricing];
  public routerLinkResources = ['/' + paths.resources];
}
