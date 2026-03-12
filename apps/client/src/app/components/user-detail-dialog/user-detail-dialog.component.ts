import { AdminUserResponse } from '@ghostfolio/common/interfaces';
import { AdminService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisVertical } from 'ionicons/icons';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { UserDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-detail-dialog',
  styleUrls: ['./user-detail-dialog.component.scss'],
  templateUrl: './user-detail-dialog.html'
})
export class GfUserDetailDialogComponent implements OnDestroy, OnInit {
  public user: AdminUserResponse;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: UserDetailDialogParams,
    public dialogRef: MatDialogRef<GfUserDetailDialogComponent>
  ) {
    addIcons({
      ellipsisVertical
    });
  }

  public ngOnInit() {
    this.adminService
      .fetchUserById(this.data.userId)
      .pipe(
        takeUntil(this.unsubscribeSubject),
        catchError(() => {
          this.dialogRef.close();

          return EMPTY;
        })
      )
      .subscribe((user) => {
        this.user = user;

        this.changeDetectorRef.markForCheck();
      });
  }

  public deleteUser() {
    this.dialogRef.close({
      action: 'delete',
      userId: this.data.userId
    });
  }

  public onClose() {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
