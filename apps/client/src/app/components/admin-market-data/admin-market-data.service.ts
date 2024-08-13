import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { ghostfolioScraperApiSymbolPrefix } from '@ghostfolio/common/config';
import { getCurrencyFromSymbol, isCurrency } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  AdminMarketDataItem
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';
import { title } from 'process';
import { EMPTY, catchError, finalize, forkJoin, takeUntil } from 'rxjs';

@Injectable()
export class AdminMarketDataService {
  public constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  public deleteAssetProfile({ dataSource, symbol }: AssetProfileIdentifier) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.adminService
          .deleteProfileData({ dataSource, symbol })
          .subscribe(() => {
            setTimeout(() => {
              window.location.reload();
            }, 300);
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this asset profile?`
    });
  }

  public deleteAssetProfiles(
    aAssetProfileIdentifiers: AssetProfileIdentifier[]
  ) {
    this.notificationService.confirm({
      confirmFn: () => {
        const deleteRequests = aAssetProfileIdentifiers.map(
          ({ dataSource, symbol }) => {
            return this.adminService.deleteProfileData({ dataSource, symbol });
          }
        );

        forkJoin(deleteRequests)
          .pipe(
            catchError(() => {
              this.notificationService.alert({
                title: '',
                message: $localize`Oops! Could not delete profiles.`
              });

              return EMPTY;
            }),
            finalize(() => {
              setTimeout(() => {
                window.location.reload();
              }, 300);
            })
          )
          .subscribe(() => {});
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete these profiles?`
    });
  }

  public hasPermissionToDeleteAssetProfile({
    activitiesCount,
    isBenchmark,
    symbol
  }: Pick<AdminMarketDataItem, 'activitiesCount' | 'isBenchmark' | 'symbol'>) {
    return (
      activitiesCount === 0 &&
      !isBenchmark &&
      !isCurrency(getCurrencyFromSymbol(symbol)) &&
      !symbol.startsWith(ghostfolioScraperApiSymbolPrefix)
    );
  }
}
