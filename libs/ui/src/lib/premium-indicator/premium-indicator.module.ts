import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PremiumIndicatorComponent } from './premium-indicator.component';

@NgModule({
  declarations: [PremiumIndicatorComponent],
  exports: [PremiumIndicatorComponent],
  imports: [CommonModule, RouterModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPremiumIndicatorModule {}
