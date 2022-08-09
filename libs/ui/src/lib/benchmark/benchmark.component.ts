import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { locale } from '@ghostfolio/common/config';
import { resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark } from '@ghostfolio/common/interfaces';

@Component({
  selector: 'gf-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark.component.html',
  styleUrls: ['./benchmark.component.scss']
})
export class BenchmarkComponent implements OnChanges {
  @Input() benchmarks: Benchmark[];
  @Input() locale: string;

  public displayedColumns = ['name', 'change', 'marketCondition'];
  public resolveMarketCondition = resolveMarketCondition;

  public constructor() {}

  public ngOnChanges() {
    if (!this.locale) {
      this.locale = locale;
    }
  }
}
