import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { PersonalFinanceToolsPageRoutingModule } from './personal-finance-tools-page-routing.module';
import { PersonalFinanceToolsPageComponent } from './personal-finance-tools-page.component';

@NgModule({
  declarations: [PersonalFinanceToolsPageComponent],
  imports: [CommonModule, MatCardModule, PersonalFinanceToolsPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PersonalFinanceToolsPageModule {}
