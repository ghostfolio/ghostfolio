import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Position, User } from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { GroupBy, ToggleOption } from '@ghostfolio/common/types';
import { differenceInDays } from 'date-fns';
import { sortBy } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html'
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  public bottom3: Position[];
  public daysInMarket: number;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public investments: InvestmentItem[];
  public investmentsByMonth: InvestmentItem[];
  public mode: GroupBy;
  public modeOptions: ToggleOption[] = [
    { label: 'Monthly', value: 'month' },
    { label: 'Accumulating', value: undefined }
  ];
  public top3: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.dataService
      .fetchInvestments()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ firstOrderDate, investments }) => {
        this.daysInMarket = differenceInDays(new Date(), firstOrderDate);
        this.investments = investments;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchInvestmentsByMonth()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ investments }) => {
        this.investmentsByMonth = investments;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPositions({ range: 'max' })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ positions }) => {
        const positionsSorted = sortBy(
          positions,
          'netPerformancePercentage'
        ).reverse();

        this.top3 = positionsSorted.slice(0, 3);

        if (positions?.length > 3) {
          this.bottom3 = positionsSorted.slice(-3).reverse();
        } else {
          this.bottom3 = [];
        }

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

  public onChangeGroupBy(aMode: GroupBy) {
    this.mode = aMode;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
