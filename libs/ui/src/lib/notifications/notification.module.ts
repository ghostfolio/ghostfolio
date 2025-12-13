import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';

import { GfAlertDialogComponent } from './alert-dialog/alert-dialog.component';
import { GfConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { NotificationService } from './notification.service';

@NgModule({
  imports: [
    CommonModule,
    GfAlertDialogComponent,
    GfConfirmationDialogComponent,
    MatDialogModule
  ],
  providers: [NotificationService]
})
export class GfNotificationModule {}
