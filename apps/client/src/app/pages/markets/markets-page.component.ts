import { GfHomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfHomeMarketComponent],
  selector: 'gf-markets-page',
  styleUrls: ['./markets-page.scss'],
  templateUrl: './markets-page.html'
})
export class GfMarketsPageComponent {}
