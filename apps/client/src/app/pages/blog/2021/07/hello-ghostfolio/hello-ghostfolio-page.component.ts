import { paths } from '@ghostfolio/common/paths';

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
  public routerLinkPricing = ['/' + paths.pricing];
  public routerLinkResources = ['/' + paths.resources];
}
