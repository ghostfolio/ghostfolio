import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark, User } from '@ghostfolio/common/interfaces';

@Component({
  selector: 'gf-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark.component.html',
  styleUrls: ['./benchmark.component.scss']
})
export class BenchmarkComponent implements OnChanges {
  @Input() benchmarks: Benchmark[];
  @Input() locale: string;
  @Input() user: User;

  public displayedColumns = ['name', 'date', 'change', 'marketCondition'];
  public resolveMarketCondition = resolveMarketCondition;

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
