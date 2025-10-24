import { GfDialogFooterComponent } from '@ghostfolio/client/components/dialog-footer/dialog-footer.component';
import { GfDialogHeaderComponent } from '@ghostfolio/client/components/dialog-header/dialog-header.component';
import { User } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
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
import { Subject } from 'rxjs';

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
export class GfUserDetailDialogComponent implements OnDestroy, OnInit {
  public title: string = 'User Information';
  public user: User;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: UserDetailDialogParams,
    public dialogRef: MatDialogRef<GfUserDetailDialogComponent>
  ) {}

  public ngOnInit() {
    this.initialize();
  }

  public onClose() {
    this.dialogRef.close();
  }

  private fetchUserDetails() {
    if (this.data.userData) {
      this.changeDetectorRef.markForCheck();
    }
  }

  private initialize() {
    this.fetchUserDetails();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
