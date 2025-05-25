import { paths } from '@ghostfolio/common/paths';

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
  public routerLinkAboutOssFriends = ['/' + paths.about, paths.ossFriends];
  public routerLinkBlog = ['/' + paths.blog];
}
