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
    public dialogRef: MatDialogRef<GfGhostfolioPremiumApiDialogComponent>
  ) {}

  public onCancel() {
    this.dialogRef.close();
  }
}
