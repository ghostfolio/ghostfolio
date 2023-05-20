import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { UnlockYourFinancialPotentialWithGhostfolioRoutingModule } from './unlock-your-financial-potential-with-ghostfolio-page-routing.module';
import { UnlockYourFinancialPotentialWithGhostfolioPageComponent } from './unlock-your-financial-potential-with-ghostfolio-page.component';

@NgModule({
  declarations: [UnlockYourFinancialPotentialWithGhostfolioPageComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    RouterModule,
    UnlockYourFinancialPotentialWithGhostfolioRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UnlockYourFinancialPotentialWithGhostfolioPageModule {}
