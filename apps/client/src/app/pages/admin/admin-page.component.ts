import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { AdminData, User } from '@ghostfolio/common/interfaces';
import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-admin-page',
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.scss']
})
export class AdminPageComponent implements OnInit {
  public dataGatheringInProgress: boolean;
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public exchangeRates: { label1: string; label2: string; value: number }[];
  public lastDataGathering: string;
  public transactionCount: number;
  public userCount: number;
  public user: User;
  public users: AdminData['users'];

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
    this.cacheService.flush().subscribe(() => {
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
      this.adminService.gatherMax().subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
    }
  }

  public formatDistanceToNow(aDateString: string) {
    if (aDateString) {
      const distanceString = formatDistanceToNowStrict(parseISO(aDateString), {
        addSuffix: true
      });

      return distanceString === '0 seconds ago' ? 'just now' : distanceString;
    }

    return '';
  }

  public onDeleteUser(aId: string) {
    const confirmation = confirm('Do you really want to delete this user?');

    if (confirmation) {
      this.dataService.deleteUser(aId).subscribe({
        next: () => {
          this.fetchAdminData();
        }
      });
    }
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
          exchangeRates,
          lastDataGathering,
          transactionCount,
          userCount,
          users
        }) => {
          this.exchangeRates = exchangeRates;
          this.users = users;

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
            this.lastDataGathering = '-';
          }

          this.transactionCount = transactionCount;
          this.userCount = userCount;

          this.changeDetectorRef.markForCheck();
        }
      );
  }
}
