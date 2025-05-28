import { paths } from '@ghostfolio/common/paths';

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
  public routerLinkBlog = ['/' + paths.blog];
  public routerLinkFeatures = ['/' + paths.features];
}
