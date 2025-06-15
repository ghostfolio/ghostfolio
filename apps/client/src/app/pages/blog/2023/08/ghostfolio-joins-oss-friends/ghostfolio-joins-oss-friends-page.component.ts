import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-joins-oss-friends-page',
  templateUrl: './ghostfolio-joins-oss-friends-page.html'
})
export class GhostfolioJoinsOssFriendsPageComponent {
  public routerLinkAboutOssFriends =
    publicRoutes.about.subRoutes.ossFriends.routerLink;
  public routerLinkBlog = ['/' + routes.blog];
}
