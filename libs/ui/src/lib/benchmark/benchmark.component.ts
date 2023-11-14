import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { locale } from '@ghostfolio/common/config';
import { resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark, User } from '@ghostfolio/common/interfaces';
import { without } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'gf-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark.component.html',
  styleUrls: ['./benchmark.component.scss']
})
export class BenchmarkComponent implements OnChanges {
  @Input() benchmarks: Benchmark[];
  @Input() locale: string;

  public displayedColumns = ['name', 'date', 'change', 'marketCondition'];
  public resolveMarketCondition = resolveMarketCondition;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

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

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnChanges() {
    if (!this.locale) {
      this.locale = locale;
    }
  }
}
