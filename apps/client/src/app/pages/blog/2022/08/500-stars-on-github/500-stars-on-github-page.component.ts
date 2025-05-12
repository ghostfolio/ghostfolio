import { paths } from '@ghostfolio/client/core/paths';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-500-stars-on-github-page',
  templateUrl: './500-stars-on-github-page.html'
})
export class FiveHundredStarsOnGitHubPageComponent {
  public routerLinkMarkets = ['/' + paths.markets];
  public routerLinkPricing = ['/' + paths.pricing];
}
