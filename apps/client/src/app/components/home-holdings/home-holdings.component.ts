import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import {
  RANGE,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Position, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-holdings',
  styleUrls: ['./home-holdings.scss'],
  templateUrl: './home-holdings.html'
})
export class HomeHoldingsComponent implements OnDestroy, OnInit {
  public dateRange: DateRange;
  public deviceType: string;
  public hasPermissionToCreateOrder: boolean;
  public positions: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private userService: UserService
  ) {
    route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['positionDetailDialog'] && params['symbol']) {
          this.openDialog(params['symbol']);
        }
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

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dateRange =
      <DateRange>this.settingsStorageService.getSetting(RANGE) || 'max';

    this.update();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openDialog(aSymbol: string): void {
    const dialogRef = this.dialog.open(PositionDetailDialog, {
      autoFocus: false,
      data: {
        baseCurrency: this.user?.settings?.baseCurrency,
        deviceType: this.deviceType,
        locale: this.user?.settings?.locale,
        symbol: aSymbol
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
  }

  private update() {
    this.dataService
      .fetchPositions({ range: this.dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.positions = response.positions;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
