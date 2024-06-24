import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { RuleComponent } from './rule.component';

@NgModule({
  declarations: [RuleComponent],
  exports: [RuleComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfRuleModule {}
