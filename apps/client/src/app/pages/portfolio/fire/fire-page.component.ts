import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import Big from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class FirePageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public fireWealth: Big;
  public isLoading = false;
  public user: User;
  public withdrawalRatePerMonth: Big;
  public withdrawalRatePerYear: Big;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.isLoading = true;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dataService
      .fetchPortfolioSummary()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ cash, currentValue }) => {
        if (cash === null || currentValue === null) {
          return;
        }

        this.fireWealth = new Big(currentValue);
        this.withdrawalRatePerYear = this.fireWealth.mul(4).div(100);
        this.withdrawalRatePerMonth = this.withdrawalRatePerYear.div(12);

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

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
