import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  isValid,
  parseISO
} from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-admin-overview',
  styleUrls: ['./admin-overview.scss'],
  templateUrl: './admin-overview.html'
})
export class AdminOverviewComponent implements OnDestroy, OnInit {
  public dataGatheringInProgress: boolean;
  public dataGatheringProgress: number;
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public exchangeRates: { label1: string; label2: string; value: number }[];
  public lastDataGathering: string;
  public transactionCount: number;
  public userCount: number;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private adminService: AdminService,
    private cacheService: CacheService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.fetchAdminData();

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });
  }

  public onFlushCache() {
    this.cacheService
      .flush()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  public onGatherMax() {
    const confirmation = confirm(
      'This action may take some time. Do you want to proceed?'
    );

    if (confirmation === true) {
      this.adminService
        .gatherMax()
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(() => {
          setTimeout(() => {
            window.location.reload();
          }, 300);
        });
    }
  }

  public onGatherProfileData() {
    this.adminService
      .gatherProfileData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public formatDistanceToNow(aDateString: string) {
    if (aDateString) {
      const distanceString = formatDistanceToNowStrict(parseISO(aDateString), {
        addSuffix: true
      });

      return Math.abs(differenceInSeconds(parseISO(aDateString), new Date())) <
        60
        ? 'just now'
        : distanceString;
    }

    return '';
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchAdminData() {
    this.dataService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          dataGatheringProgress,
          exchangeRates,
          lastDataGathering,
          transactionCount,
          userCount
        }) => {
          this.dataGatheringProgress = dataGatheringProgress;
          this.exchangeRates = exchangeRates;

          if (isValid(parseISO(lastDataGathering?.toString()))) {
            this.lastDataGathering = formatDistanceToNowStrict(
              new Date(lastDataGathering),
              {
                addSuffix: true
              }
            );
          } else if (lastDataGathering === 'IN_PROGRESS') {
            this.dataGatheringInProgress = true;
          } else {
            this.lastDataGathering = 'Starting soon...';
          }

          this.transactionCount = transactionCount;
          this.userCount = userCount;

          this.changeDetectorRef.markForCheck();
        }
      );
  }
}
