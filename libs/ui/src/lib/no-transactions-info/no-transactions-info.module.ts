import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { RouterModule } from '@angular/router';
import { GfLogoModule } from '@ghostfolio/ui/logo';

import { NoTransactionsInfoComponent } from './no-transactions-info.component';

@NgModule({
  declarations: [NoTransactionsInfoComponent],
  exports: [NoTransactionsInfoComponent],
  imports: [CommonModule, GfLogoModule, MatButtonModule, RouterModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfNoTransactionsInfoModule {}
