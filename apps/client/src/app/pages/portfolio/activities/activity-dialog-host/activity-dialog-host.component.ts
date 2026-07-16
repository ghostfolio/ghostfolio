import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateOrderDto, UpdateOrderDto } from '@ghostfolio/common/dtos';
import { Activity, User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

import { GfCreateOrUpdateActivityDialogComponent } from '../create-or-update-activity-dialog/create-or-update-activity-dialog.component';
import { CreateOrUpdateActivityDialogParams } from '../create-or-update-activity-dialog/interfaces/interfaces';

type ActivityDialogMode = 'clone' | 'create' | 'update';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activity-dialog-host',
  template: ''
})
export class GfActivityDialogHostComponent implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const mode = this.route.snapshot.data.mode as ActivityDialogMode;
    const activityId = this.route.snapshot.paramMap.get('activityId');

    const activity$: Observable<Activity | undefined> = activityId
      ? this.dataService.fetchActivity(activityId)
      : of(undefined);

    this.userService
      .get()
      .pipe(
        switchMap((user) => {
          return activity$.pipe(map((activity) => ({ activity, user })));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.navigateBack();
        },
        next: ({ activity, user }) => {
          this.openDialog(mode, user, activity);
        }
      });
  }

  private navigateBack() {
    void this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink
    );
  }

  private openDialog(
    aMode: ActivityDialogMode,
    aUser: User,
    aActivity?: Activity
  ) {
    const deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;
    const isUpdate = aMode === 'update';

    const dialogRef = this.dialog.open<
      GfCreateOrUpdateActivityDialogComponent,
      CreateOrUpdateActivityDialogParams
    >(GfCreateOrUpdateActivityDialogComponent, {
      data: {
        accounts: aUser?.accounts,
        activity:
          isUpdate && aActivity
            ? aActivity
            : {
                ...aActivity,
                accountId: aActivity?.accountId,
                assetProfile: aActivity?.assetProfile ?? null,
                date: new Date(),
                fee: 0,
                id: null,
                type: aActivity?.type ?? 'BUY',
                unitPrice: null
              },
        user: aUser
      },
      height: deviceType === 'mobile' ? '98vh' : '80vh',
      width: deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: CreateOrderDto | UpdateOrderDto | null) => {
        if (!result) {
          this.navigateBack();

          return;
        }

        const request$: Observable<unknown> = isUpdate
          ? this.dataService.putActivity(result as UpdateOrderDto)
          : this.dataService.postActivity(result as CreateOrderDto);

        request$
          .pipe(
            finalize(() => {
              this.navigateBack();
            })
          )
          .subscribe({
            next: () => {
              this.userService.get(true).subscribe();
            }
          });
      });
  }
}
