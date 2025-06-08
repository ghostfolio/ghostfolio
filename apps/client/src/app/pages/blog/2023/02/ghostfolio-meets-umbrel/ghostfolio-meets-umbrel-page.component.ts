import { routes } from '@ghostfolio/common/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-umbrel-page',
  templateUrl: './ghostfolio-meets-umbrel-page.html'
})
export class GhostfolioMeetsUmbrelPageComponent {
  public routerLinkBlog = ['/' + routes.blog];
}
