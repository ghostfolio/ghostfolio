import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminData } from '@ghostfolio/api/app/admin/interfaces/admin-data.interface';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/helper';
import { formatDistanceToNow, isValid, parseISO, sub } from 'date-fns';
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
  public users: AdminData['users'];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private adminService: AdminService,
    private cacheService: CacheService,
    private cd: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
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
            this.lastDataGathering = formatDistanceToNow(
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

          this.cd.markForCheck();
        }
      );
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
      const distanceString = formatDistanceToNow(
        sub(parseISO(aDateString), { seconds: 10 }),
        {
          addSuffix: true
        }
      );

      return distanceString === 'less than a minute ago'
        ? 'just now'
        : distanceString;
    }

    return '';
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
