import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Access } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, Subject, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';

import { GfCreateOrUpdateAccessDialogComponent } from '../create-or-update-access-dialog/create-or-update-access-dialog.component';
import { CreateOrUpdateAccessDialogParams } from '../create-or-update-access-dialog/interfaces/interfaces';
import { AccessDialogMode } from './types/access-dialog-mode.type';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-access-dialog-host',
  template: ''
})
export class GfAccessDialogHostComponent implements OnDestroy, OnInit {
  private dialogRef: MatDialogRef<GfCreateOrUpdateAccessDialogComponent>;

  private readonly deviceType = computed(() => {
    return this.deviceDetectorService.deviceInfo().deviceType;
  });

  private readonly dialogClosed = new Subject<void>();

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const mode = this.route.snapshot.data.mode as AccessDialogMode;

    // The router reuses this component when only the access id changes, so
    // the parameters are observed instead of read from the snapshot once
    this.route.paramMap
      .pipe(
        map((paramMap) => {
          return paramMap.get('accessId');
        }),
        distinctUntilChanged(),
        tap(() => {
          this.closeDialog();
        }),
        switchMap((accessId) => {
          const access$: Observable<Access | undefined> =
            mode === 'update' && accessId
              ? this.fetchAccess(accessId)
              : of(undefined);

          return this.userService.get().pipe(
            switchMap((user) => {
              return access$.pipe(
                map((access) => {
                  return { access, user };
                })
              );
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.navigateBack();
        },
        next: ({ access, user }) => {
          if (mode === 'update') {
            if (
              !access ||
              !hasPermission(user?.permissions, permissions.updateAccess)
            ) {
              this.navigateBack();

              return;
            }

            this.openCreateOrUpdateAccessDialog({ access });

            return;
          }

          if (!hasPermission(user?.permissions, permissions.createAccess)) {
            this.navigateBack();

            return;
          }

          this.openCreateOrUpdateAccessDialog({});
        }
      });
  }

  public ngOnDestroy() {
    // The dialog lives in an overlay outside of this component, so it needs to
    // be closed explicitly when leaving the route (for example via the browser
    // navigation)
    this.dialogRef?.close();

    this.dialogClosed.complete();
  }

  private closeDialog() {
    // Tear down the subscription of the dialog which is about to be replaced,
    // so that its result is not mistaken for the user closing it
    this.dialogClosed.next();

    this.dialogRef?.close();
  }

  private fetchAccess(aAccessId: string) {
    return this.dataService.fetchAccesses().pipe(
      map((accesses) => {
        return accesses.find(({ id }) => {
          return id === aAccessId;
        });
      })
    );
  }

  private navigateBack() {
    void this.router.navigate(
      internalRoutes.account.subRoutes.access.routerLink
    );
  }

  private openCreateOrUpdateAccessDialog(
    data: CreateOrUpdateAccessDialogParams
  ) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateAccessDialogComponent,
      CreateOrUpdateAccessDialogParams
    >(GfCreateOrUpdateAccessDialogComponent, {
      data,
      height: this.deviceType() === 'mobile' ? '98vh' : undefined,
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef = dialogRef;

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.dialogClosed), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          // Deliberately not bound to the destroy reference: navigating back
          // destroys this component and the refreshed user is what makes the
          // access page reload its data
          this.userService.get(true).subscribe();
        }

        this.navigateBack();
      });
  }
}
