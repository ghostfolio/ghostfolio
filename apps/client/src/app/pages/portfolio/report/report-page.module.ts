import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RulesModule } from '@ghostfolio/client/components/rules/rules.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { ReportPageRoutingModule } from './report-page-routing.module';
import { ReportPageComponent } from './report-page.component';

@NgModule({
  declarations: [ReportPageComponent],
  imports: [
    CommonModule,
    GfPremiumIndicatorModule,
    ReportPageRoutingModule,
    RulesModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReportPageModule {}
