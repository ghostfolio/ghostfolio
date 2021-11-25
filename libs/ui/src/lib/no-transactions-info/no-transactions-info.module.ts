import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { GfLogoModule } from '../../../../ui/src/lib/logo'; // TODO: @ghostfolio/ui/logo
import { NoTransactionsInfoComponent } from './no-transactions-info.component';

@NgModule({
  declarations: [NoTransactionsInfoComponent],
  exports: [NoTransactionsInfoComponent],
  imports: [CommonModule, GfLogoModule, MatButtonModule, RouterModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfNoTransactionsInfoModule {}
