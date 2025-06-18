import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-exploring-the-path-to-fire-page-page',
  templateUrl: './exploring-the-path-to-fire-page.html'
})
export class ExploringThePathToFirePageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
}
