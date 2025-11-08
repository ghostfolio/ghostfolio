import { AdminUserResponse } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  Inject,
  OnDestroy
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { Subject, EMPTY } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

import { NotificationService } from '../../core/notification/notification.service';
import { AdminService } from '../../services/admin.service';
import { GfDialogFooterComponent } from '../dialog-footer/dialog-footer.component';
import { GfDialogHeaderComponent } from '../dialog-header/dialog-header.component';
import { UserDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-detail-dialog',
  styleUrls: ['./user-detail-dialog.component.scss'],
  templateUrl: './user-detail-dialog.html'
})
export class GfUserDetailDialogComponent implements OnInit, OnDestroy {
  private unsubscribeSubject = new Subject<void>();
  public isLoading = true;
  public user: AdminUserResponse;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: UserDetailDialogParams,
    public dialogRef: MatDialogRef<GfUserDetailDialogComponent>,
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  public ngOnInit(): void {
    this.adminService
      .fetchUserById(this.data.userId)
      .pipe(
        takeUntil(this.unsubscribeSubject),
        finalize(() => (this.isLoading = false)),
        catchError(() => {
          this.notificationService.alert({
            title: $localize`User`,
            message: $localize`Unable to load user`
          });
          this.dialogRef.close();
          return EMPTY;
        })
      )
      .subscribe((user) => {
        this.user = user;
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
