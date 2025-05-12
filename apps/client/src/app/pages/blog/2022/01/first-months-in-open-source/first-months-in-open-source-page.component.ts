import { paths } from '@ghostfolio/client/core/paths';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-first-months-in-open-source-page',
  templateUrl: './first-months-in-open-source-page.html'
})
export class FirstMonthsInOpenSourcePageComponent {
  public routerLinkPricing = ['/' + paths.pricing];
}
