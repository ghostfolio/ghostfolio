import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_DATE_FORMAT,
  PROPERTY_CURRENCIES,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_SYSTEM_MESSAGE
} from '@ghostfolio/common/config';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  isValid,
  parseISO
} from 'date-fns';
import { uniq } from 'lodash';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-admin-overview',
  styleUrls: ['./admin-overview.scss'],
  templateUrl: './admin-overview.html'
})
export class AdminOverviewComponent implements OnDestroy, OnInit {
  public customCurrencies: string[];
  public dataGatheringInProgress: boolean;
  public dataGatheringProgress: number;
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public exchangeRates: { label1: string; label2: string; value: number }[];
  public hasPermissionForSystemMessage: boolean;
  public hasPermissionToToggleReadOnlyMode: boolean;
  public info: InfoItem;
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
  ) {
    this.info = this.dataService.fetchInfo();

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionForSystemMessage = hasPermission(
            this.info.globalPermissions,
            permissions.enableSystemMessage
          );

          this.hasPermissionToToggleReadOnlyMode = hasPermission(
            this.user.permissions,
            permissions.toggleReadOnlyMode
          );
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.fetchAdminData();
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

  public onAddCurrency() {
    const currency = prompt('Please add a currency:');

    if (currency) {
      const currencies = uniq([...this.customCurrencies, currency]);
      this.putCurrencies(currencies);
    }
  }

  public onDeleteCurrency(aCurrency: string) {
    const confirmation = confirm('Do you really want to delete this currency?');

    if (confirmation) {
      const currencies = this.customCurrencies.filter((currency) => {
        return currency !== aCurrency;
      });
      this.putCurrencies(currencies);
    }
  }

  public onDeleteSystemMessage() {
    this.putSystemMessage('');
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

  public onReadOnlyModeChange(aEvent: MatSlideToggleChange) {
    this.setReadOnlyMode(aEvent.checked);
  }

  public onSetSystemMessage() {
    const systemMessage = prompt('Please set your system message:');

    if (systemMessage) {
      this.putSystemMessage(systemMessage);
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
          dataGatheringProgress,
          exchangeRates,
          lastDataGathering,
          settings,
          transactionCount,
          userCount
        }) => {
          this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];
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

  private putCurrencies(aCurrencies: string[]) {
    this.dataService
      .putAdminSetting(PROPERTY_CURRENCIES, {
        value: JSON.stringify(aCurrencies)
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  private putSystemMessage(aSystemMessage: string) {
    this.dataService
      .putAdminSetting(PROPERTY_SYSTEM_MESSAGE, {
        value: aSystemMessage
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  private setReadOnlyMode(aValue: boolean) {
    this.dataService
      .putAdminSetting(PROPERTY_IS_READ_ONLY_MODE, {
        value: aValue ? 'true' : ''
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }
}
