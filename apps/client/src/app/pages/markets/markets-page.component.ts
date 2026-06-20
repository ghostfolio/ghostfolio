import { GfHomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';

import { Component } from '@angular/core';

@Component({
  host: { class: 'page' },
  imports: [GfHomeMarketComponent],
  selector: 'gf-markets-page',
  styleUrls: ['./markets-page.scss'],
  templateUrl: './markets-page.html'
})
export class GfMarketsPageComponent {}
