import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Statistics, User } from '@ghostfolio/common/interfaces';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-open-page',
  styleUrls: ['./open-page.scss'],
  templateUrl: './open-page.html'
})
export class OpenPageComponent implements OnDestroy, OnInit {
  public statistics: Statistics;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    const { statistics } = this.dataService.fetchInfo();

    this.statistics = statistics;
  }

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
