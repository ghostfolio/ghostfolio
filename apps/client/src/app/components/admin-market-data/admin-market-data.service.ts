import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService } from '@ghostfolio/ui/services';

import { Injectable } from '@angular/core';
import { EMPTY, catchError, finalize, forkJoin } from 'rxjs';

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
    const assetProfileCount = aAssetProfileIdentifiers.length;

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
                title:
                  assetProfileCount === 1
                    ? $localize`Oops! Could not delete the asset profile.`
                    : $localize`Oops! Could not delete the asset profiles.`
              });

              return EMPTY;
            }),
            finalize(() => {
              window.location.reload();
            })
          )
          .subscribe();
      },
      confirmType: ConfirmationDialogType.Warn,
      title:
        assetProfileCount === 1
          ? $localize`Do you really want to delete this asset profile?`
          : $localize`Do you really want to delete these ${assetProfileCount}:count: asset profiles?`
    });
  }
}
