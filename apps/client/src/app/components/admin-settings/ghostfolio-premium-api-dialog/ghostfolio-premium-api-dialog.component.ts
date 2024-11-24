import { DataService } from '@ghostfolio/client/services/data.service';
import { PROPERTY_API_KEY_GHOSTFOLIO } from '@ghostfolio/common/config';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
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
    CommonModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatDialogModule
  ],
  selector: 'gf-ghostfolio-premium-api-dialog',
  standalone: true,
  styleUrls: ['./ghostfolio-premium-api-dialog.scss'],
  templateUrl: './ghostfolio-premium-api-dialog.html'
})
export class GfGhostfolioPremiumApiDialogComponent {
  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: GhostfolioPremiumApiDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfGhostfolioPremiumApiDialogComponent>
  ) {}

  public onCancel() {
    this.dialogRef.close();
  }

  public onSetGhostfolioApiKey() {
    let ghostfolioApiKey = prompt(
      $localize`Please enter your Ghostfolio API key:`
    );
    ghostfolioApiKey = ghostfolioApiKey?.trim();

    if (ghostfolioApiKey) {
      this.dataService
        .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, {
          value: ghostfolioApiKey
        })
        .subscribe(() => {
          this.dialogRef.close();
        });
    }
  }
}
