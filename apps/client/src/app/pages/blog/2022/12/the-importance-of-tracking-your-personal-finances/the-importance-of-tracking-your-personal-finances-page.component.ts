import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-the-importance-of-tracking-your-personal-finances-page',
  templateUrl: './the-importance-of-tracking-your-personal-finances-page.html'
})
export class TheImportanceOfTrackingYourPersonalFinancesPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
}
