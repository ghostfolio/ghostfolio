import { routes } from '@ghostfolio/common/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2024-page',
  templateUrl: './hacktoberfest-2024-page.html'
})
export class Hacktoberfest2024PageComponent {
  public routerLinkAbout = ['/' + routes.about];
  public routerLinkBlog = ['/' + routes.blog];
  public routerLinkOpenStartup = ['/' + routes.openStartup];
}
