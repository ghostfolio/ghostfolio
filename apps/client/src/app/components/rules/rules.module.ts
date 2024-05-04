import { GfRuleModule } from '@ghostfolio/client/components/rule/rule.module';
import { GfNoTransactionsInfoComponent } from '@ghostfolio/ui/no-transactions-info';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { RulesComponent } from './rules.component';

@NgModule({
  declarations: [RulesComponent],
  exports: [RulesComponent],
  imports: [
    CommonModule,
    GfNoTransactionsInfoComponent,
    GfRuleModule,
    MatButtonModule,
    MatCardModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfRulesModule {}
