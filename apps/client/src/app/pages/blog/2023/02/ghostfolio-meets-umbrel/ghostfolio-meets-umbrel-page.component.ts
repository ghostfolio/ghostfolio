import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-umbrel-page',
  templateUrl: './ghostfolio-meets-umbrel-page.html'
})
export class GhostfolioMeetsUmbrelPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
}
