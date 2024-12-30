import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-data-provider-credits',
  styleUrls: ['./data-provider-credits.component.scss'],
  templateUrl: './data-provider-credits.component.html'
})
export class GfDataProviderCreditsComponent {
  @Input() dataProviderInfos: DataProviderInfo[];
}
