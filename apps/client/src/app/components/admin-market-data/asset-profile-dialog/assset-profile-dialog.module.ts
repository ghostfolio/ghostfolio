import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { GfAdminMarketDataDetailModule } from '@ghostfolio/client/components/admin-market-data-detail/admin-market-data-detail.module';
import { GfPortfolioProportionChartModule } from '@ghostfolio/ui/portfolio-proportion-chart/portfolio-proportion-chart.module';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AssetProfileDialog } from './asset-profile-dialog.component';

@NgModule({
  declarations: [AssetProfileDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfAdminMarketDataDetailModule,
    GfPortfolioProportionChartModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatMenuModule,
    ReactiveFormsModule,
    TextFieldModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAssetProfileDialogModule {}
