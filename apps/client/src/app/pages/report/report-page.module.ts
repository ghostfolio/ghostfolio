import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RulesModule } from 'apps/client/src/app/components/rules/rules.module';

import { ReportPageRoutingModule } from './report-page-routing.module';
import { ReportPageComponent } from './report-page.component';

@NgModule({
  declarations: [ReportPageComponent],
  exports: [],
  imports: [CommonModule, ReportPageRoutingModule, RulesModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReportPageModule {}
