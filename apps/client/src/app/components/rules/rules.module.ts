import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { GfRuleModule } from '@ghostfolio/client/components/rule/rule.module';
import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';

import { GfPositionModule } from '../position/position.module';
import { RulesComponent } from './rules.component';

@NgModule({
  declarations: [RulesComponent],
  exports: [RulesComponent],
  imports: [
    CommonModule,
    GfNoTransactionsInfoModule,
    GfPositionModule,
    GfRuleModule,
    MatButtonModule,
    MatCardModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RulesModule {}
