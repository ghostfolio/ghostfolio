import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2023-debriefing-page',
  templateUrl: './hacktoberfest-2023-debriefing-page.html'
})
export class Hacktoberfest2023DebriefingPageComponent {
  public routerLinkAbout = publicRoutes.about.routerLink;
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
}
