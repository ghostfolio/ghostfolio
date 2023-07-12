import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { DataProviderCreditsComponent } from './data-provider-credits.component';

@NgModule({
  declarations: [DataProviderCreditsComponent],
  exports: [DataProviderCreditsComponent],
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDataProviderCreditsModule {}
