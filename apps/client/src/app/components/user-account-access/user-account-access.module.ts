import { GfPortfolioAccessTableModule } from '@ghostfolio/client/components/access-table/access-table.module';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';

import { GfCreateOrUpdateAccessDialogModule } from './create-or-update-access-dialog/create-or-update-access-dialog.module';
import { UserAccountAccessComponent } from './user-account-access.component';

@NgModule({
  declarations: [UserAccountAccessComponent],
  exports: [UserAccountAccessComponent],
  imports: [
    CommonModule,
    GfCreateOrUpdateAccessDialogModule,
    GfPortfolioAccessTableModule,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfUserAccountAccessModule {}
