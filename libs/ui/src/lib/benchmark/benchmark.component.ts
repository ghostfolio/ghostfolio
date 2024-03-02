import { getLocale, resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark, User } from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';

@Component({
  selector: 'gf-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark.component.html',
  styleUrls: ['./benchmark.component.scss']
})
export class BenchmarkComponent implements OnChanges {
  @Input() benchmarks: Benchmark[];
  @Input() locale = getLocale();
  @Input() user: User;

  public displayedColumns = ['name', 'date', 'change', 'marketCondition'];
  public resolveMarketCondition = resolveMarketCondition;
  public translate = translate;

  public constructor() {}

  public ngOnChanges() {
    if (this.user?.settings?.isExperimentalFeatures) {
      this.displayedColumns = [
        'name',
        'trend50d',
        'trend200d',
        'date',
        'change',
        'marketCondition'
      ];
    }
  }
}
