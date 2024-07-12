import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PortfolioPosition,
  UniqueAsset,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  HoldingType,
  HoldingViewMode,
  ToggleOption
} from '@ghostfolio/common/types';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-holdings',
  styleUrls: ['./home-holdings.scss'],
  templateUrl: './home-holdings.html'
})
export class HomeHoldingsComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public holdings: PortfolioPosition[];
  public holdingType: HoldingType = 'ACTIVE';
  public holdingTypeOptions: ToggleOption[] = [
    { label: $localize`Active`, value: 'ACTIVE' },
    { label: $localize`Closed`, value: 'CLOSED' }
  ];
  public user: User;
  public viewModeFormControl = new FormControl<HoldingViewMode>('TABLE');

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOrder = hasPermission(
            this.user.permissions,
            permissions.createOrder
          );

          this.holdings = undefined;

          this.fetchHoldings()
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe(({ holdings }) => {
              this.holdings = holdings;

              this.changeDetectorRef.markForCheck();
            });

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onChangeHoldingType(aHoldingType: HoldingType) {
    this.holdingType = aHoldingType;

    if (this.holdingType === 'ACTIVE') {
      this.viewModeFormControl.enable();
    } else if (this.holdingType === 'CLOSED') {
      this.viewModeFormControl.disable();

      this.viewModeFormControl.setValue('TABLE');
    }

    this.holdings = undefined;

    this.fetchHoldings()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onSymbolClicked({ dataSource, symbol }: UniqueAsset) {
    if (dataSource && symbol) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, holdingDetailDialog: true }
      });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchHoldings() {
    const filters = this.userService.getFilters();

    if (this.holdingType === 'CLOSED') {
      filters.push({ id: 'CLOSED', type: 'HOLDING_TYPE' });
    }

    return this.dataService.fetchPortfolioHoldings({
      filters,
      range: this.user?.settings?.dateRange
    });
  }
}
