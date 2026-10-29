import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfCreateWatchlistItemDialogComponent } from '../create-watchlist-item-dialog/create-watchlist-item-dialog.component';
import { CreateWatchlistItemDialogParams } from '../create-watchlist-item-dialog/interfaces/interfaces';
import { HomeWatchlistService } from '../home-watchlist.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-watchlist-dialog-host',
  template: ''
})
export class GfWatchlistDialogHostComponent implements OnDestroy, OnInit {
  private dialogRef: MatDialogRef<GfCreateWatchlistItemDialogComponent>;

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly homeWatchlistService = inject(HomeWatchlistService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (
          !hasPermission(user?.permissions, permissions.createWatchlistItem) ||
          !hasScope(user?.scopes, scopes.watchlistCreate)
        ) {
          this.navigateBack();

          return;
        }

        this.openDialog(user);
      });
  }

  public ngOnDestroy() {
    // The dialog lives in an overlay outside of this component, so it needs to
    // be closed explicitly when leaving the route (for example via the browser
    // navigation)
    this.dialogRef?.close();
  }

  private navigateBack() {
    void this.router.navigate(
      internalRoutes.home.subRoutes.watchlist.routerLink
    );
  }

  private openDialog(user: User) {
    const deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    const dialogRef = this.dialog.open<
      GfCreateWatchlistItemDialogComponent,
      CreateWatchlistItemDialogParams
    >(GfCreateWatchlistItemDialogComponent, {
      data: {
        deviceType,
        locale: user?.settings?.locale ?? DEFAULT_LOCALE
      },
      width: deviceType === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef = dialogRef;

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ dataSource, symbol } = {}) => {
        if (!dataSource || !symbol) {
          this.navigateBack();

          return;
        }

        this.dataService
          .postWatchlistItem({ dataSource, symbol })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            error: () => {
              this.navigateBack();
            },
            next: () => {
              this.homeWatchlistService.triggerRefresh();

              this.navigateBack();
            }
          });
      });
  }
}
