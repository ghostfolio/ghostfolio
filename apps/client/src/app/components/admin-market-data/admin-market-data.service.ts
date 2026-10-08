import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService } from '@ghostfolio/ui/services';

import { inject, Service } from '@angular/core';
import { EMPTY, Subject, catchError, finalize, forkJoin } from 'rxjs';

@Service({ autoProvided: false })
export class AdminMarketDataService {
  private readonly refreshSubject = new Subject<void>();

  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);

  public get refresh$() {
    return this.refreshSubject.asObservable();
  }

  public deleteAssetProfile({ dataSource, symbol }: AssetProfileIdentifier) {
    const assetProfileDeleted = new Subject<void>();

    this.notificationService.confirm({
      confirmFn: () => {
        this.adminService
          .deleteProfileData({ dataSource, symbol })
          .subscribe(() => {
            assetProfileDeleted.next();
            assetProfileDeleted.complete();
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this asset profile?`
    });

    return assetProfileDeleted.asObservable();
  }

  public deleteAssetProfiles(
    aAssetProfileIdentifiers: AssetProfileIdentifier[]
  ) {
    const assetProfileCount = aAssetProfileIdentifiers.length;
    const assetProfilesDeleted = new Subject<void>();

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
              assetProfilesDeleted.next();
              assetProfilesDeleted.complete();
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

    return assetProfilesDeleted.asObservable();
  }

  public triggerRefresh() {
    this.refreshSubject.next();
  }
}
