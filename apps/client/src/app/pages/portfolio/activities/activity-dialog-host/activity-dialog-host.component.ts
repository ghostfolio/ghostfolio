import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateOrderDto, UpdateOrderDto } from '@ghostfolio/common/dtos';
import { Activity, User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { GfCreateOrUpdateActivityDialogComponent } from '../create-or-update-activity-dialog/create-or-update-activity-dialog.component';
import { CreateOrUpdateActivityDialogParams } from '../create-or-update-activity-dialog/interfaces/interfaces';
import { ActivityDialogMode } from './types/activity-dialog-mode.type';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activity-dialog-host',
  template: ''
})
export class GfActivityDialogHostComponent implements OnDestroy, OnInit {
  private dialogRef: MatDialogRef<GfCreateOrUpdateActivityDialogComponent>;

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
          return activity$.pipe(
            map((activity) => {
              return { activity, user };
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.navigateBack();
        },
        next: ({ activity, user }) => {
          if (mode === 'update') {
            if (!activity) {
              this.navigateBack();

              return;
            }

            this.openDialog({ activity, user, isUpdate: true });

            return;
          }

          if (mode === 'clone' && !activity) {
            this.navigateBack();

            return;
          }

          this.openDialog({
            user,
            activity: {
              ...activity,
              accountId: activity?.accountId,
              assetProfile: activity?.assetProfile ?? null,
              date: new Date(),
              fee: 0,
              id: null,
              type: activity?.type ?? 'BUY',
              unitPrice: null
            },
            isUpdate: false
          });
        }
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
      internalRoutes.portfolio.subRoutes.activities.routerLink
    );
  }

  private openDialog({
    activity,
    isUpdate,
    user
  }: {
    activity: CreateOrUpdateActivityDialogParams['activity'];
    isUpdate: boolean;
    user: User;
  }) {
    const deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.dialogRef = this.dialog.open<
      GfCreateOrUpdateActivityDialogComponent,
      CreateOrUpdateActivityDialogParams
    >(GfCreateOrUpdateActivityDialogComponent, {
      data: {
        activity,
        user,
        accounts: user?.accounts
      },
      height: deviceType === 'mobile' ? '98vh' : '80vh',
      width: deviceType === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef
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

        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          error: () => {
            this.navigateBack();
          },
          next: () => {
            // Deliberately not bound to the destroy reference: navigating back
            // destroys this component and the refreshed user is what makes the
            // activities page reload its data
            this.userService.get(true).subscribe();

            this.navigateBack();
          }
        });
      });
  }
}
