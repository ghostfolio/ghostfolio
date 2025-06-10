import { routes } from '@ghostfolio/common/routes/routes';

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
  public routerLinkBlog = ['/' + routes.blog];
  public routerLinkFeatures = ['/' + routes.features];
  public routerLinkPricing = ['/' + routes.pricing];
}
