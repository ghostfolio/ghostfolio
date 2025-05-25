import { paths } from '@ghostfolio/common/paths';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-internet-identity-page',
  templateUrl: './ghostfolio-meets-internet-identity-page.html'
})
export class GhostfolioMeetsInternetIdentityPageComponent {
  public routerLinkBlog = ['/' + paths.blog];
}
