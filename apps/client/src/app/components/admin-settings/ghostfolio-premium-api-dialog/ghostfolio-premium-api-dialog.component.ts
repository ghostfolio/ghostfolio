import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { PROPERTY_API_KEY_GHOSTFOLIO } from '@ghostfolio/common/config';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { GfDialogFooterModule } from '../../dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '../../dialog-header/dialog-header.module';
import { GhostfolioPremiumApiDialogParams } from './interfaces/interfaces';

@Component({
  imports: [
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatDialogModule
  ],
  selector: 'gf-ghostfolio-premium-api-dialog',
  styleUrls: ['./ghostfolio-premium-api-dialog.scss'],
  templateUrl: './ghostfolio-premium-api-dialog.html'
})
export class GfGhostfolioPremiumApiDialogComponent {
  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: GhostfolioPremiumApiDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfGhostfolioPremiumApiDialogComponent>,
    private notificationService: NotificationService
  ) {}

  public onCancel() {
    this.dialogRef.close();
  }

  public onSetGhostfolioApiKey() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        const ghostfolioApiKey = value?.trim();

        if (ghostfolioApiKey) {
          this.dataService
            .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, {
              value: ghostfolioApiKey
            })
            .subscribe(() => {
              this.dialogRef.close();
            });
        }
      },
      title: $localize`Please enter your Ghostfolio API key.`
    });
  }
}
