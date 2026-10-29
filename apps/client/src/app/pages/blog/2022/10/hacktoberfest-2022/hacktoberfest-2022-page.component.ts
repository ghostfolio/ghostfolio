import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2022-page',
  templateUrl: './hacktoberfest-2022-page.html'
})
export class Hacktoberfest2022PageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
}
