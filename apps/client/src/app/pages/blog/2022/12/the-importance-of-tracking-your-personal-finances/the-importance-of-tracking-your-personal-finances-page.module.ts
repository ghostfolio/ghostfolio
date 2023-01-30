import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { RouterModule } from '@angular/router';

import { TheImportanceOfTrackingYourPersonalFinancesRoutingModule } from './the-importance-of-tracking-your-personal-finances-page-routing.module';
import { TheImportanceOfTrackingYourPersonalFinancesPageComponent } from './the-importance-of-tracking-your-personal-finances-page.component';

@NgModule({
  declarations: [TheImportanceOfTrackingYourPersonalFinancesPageComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    RouterModule,
    TheImportanceOfTrackingYourPersonalFinancesRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TheImportanceOfTrackingYourPersonalFinancesPageModule {}
