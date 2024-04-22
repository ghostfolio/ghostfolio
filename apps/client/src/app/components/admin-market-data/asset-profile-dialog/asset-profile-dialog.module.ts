import { GfAdminMarketDataDetailModule } from '@ghostfolio/client/components/admin-market-data-detail/admin-market-data-detail.module';
import { AdminMarketDataService } from '@ghostfolio/client/components/admin-market-data/admin-market-data.service';
import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AssetProfileDialog } from './asset-profile-dialog.component';

@NgModule({
  declarations: [AssetProfileDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfAdminMarketDataDetailModule,
    GfAssetProfileIconComponent,
    GfCurrencySelectorComponent,
    GfPortfolioProportionChartComponent,
    GfValueComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    TextFieldModule
  ],
  providers: [AdminMarketDataService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAssetProfileDialogModule {}
