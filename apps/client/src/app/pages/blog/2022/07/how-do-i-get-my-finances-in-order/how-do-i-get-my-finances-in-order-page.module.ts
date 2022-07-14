import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HowDoIGetMyFinancesInOrderRoutingModule } from './how-do-i-get-my-finances-in-order-page-routing.module';
import { HowDoIGetMyFinancesInOrderPageComponent } from './how-do-i-get-my-finances-in-order-page.component';

@NgModule({
  declarations: [HowDoIGetMyFinancesInOrderPageComponent],
  imports: [
    CommonModule,
    HowDoIGetMyFinancesInOrderRoutingModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HowDoIGetMyFinancesInOrderPageModule {}
