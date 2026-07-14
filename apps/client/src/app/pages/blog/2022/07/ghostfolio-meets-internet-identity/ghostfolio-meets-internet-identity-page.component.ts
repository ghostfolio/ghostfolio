import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-internet-identity-page',
  templateUrl: './ghostfolio-meets-internet-identity-page.html'
})
export class GhostfolioMeetsInternetIdentityPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
}
