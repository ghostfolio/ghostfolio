import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-data-provider-credits',
  styleUrls: ['./data-provider-credits.component.scss'],
  templateUrl: './data-provider-credits.component.html'
})
export class DataProviderCreditsComponent {
  @Input() dataProviderInfos: DataProviderInfo[];

  public constructor() {}
}
