import { paths } from '@ghostfolio/client/core/paths';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-1000-stars-on-github-page',
  templateUrl: './1000-stars-on-github-page.html'
})
export class ThousandStarsOnGitHubPageComponent {
  public routerLinkFeatures = ['/' + paths.features];
  public routerLinkPricing = ['/' + paths.pricing];
}
