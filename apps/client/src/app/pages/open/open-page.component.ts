import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Statistics, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';

@Component({
  host: { class: 'page' },
  imports: [GfValueComponent, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-open-page',
  styleUrls: ['./open-page.scss'],
  templateUrl: './open-page.html'
})
export class GfOpenPageComponent implements OnInit {
  public statistics: Statistics;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {
    const { statistics } = this.dataService.fetchInfo();

    this.statistics = statistics;
  }

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
