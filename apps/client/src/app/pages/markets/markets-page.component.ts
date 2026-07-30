import { GfMarketsComponent } from '@ghostfolio/client/components/markets/markets.component';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfMarketsComponent],
  selector: 'gf-markets-page',
  styleUrls: ['./markets-page.scss'],
  templateUrl: './markets-page.html'
})
export class GfMarketsPageComponent {}
