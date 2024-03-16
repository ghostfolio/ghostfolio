import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioPosition, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { HoldingType, ToggleOption } from '@ghostfolio/common/types';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DataSource } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-holdings-page',
  styleUrls: ['./holdings-page.scss'],
  templateUrl: './holdings-page.html'
})
export class HoldingsPageComponent implements OnDestroy, OnInit {
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

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['dataSource'] &&
          params['positionDetailDialog'] &&
          params['symbol']
        ) {
          this.openPositionDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });
  }

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

    this.holdings = undefined;

    this.fetchHoldings()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
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
      filters
    });
  }

  private openPositionDialog({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(PositionDetailDialog, {
          autoFocus: false,
          data: <PositionDetailDialogParams>{
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            colorScheme: this.user?.settings?.colorScheme,
            deviceType: this.deviceType,
            hasImpersonationId: this.hasImpersonationId,
            hasPermissionToReportDataGlitch: hasPermission(
              this.user?.permissions,
              permissions.reportDataGlitch
            ),
            locale: this.user?.settings?.locale
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }
}
