import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfAssistantListItemModule } from './assistant-list-item/assistant-list-item.module';
import { AssistantComponent } from './assistant.component';

@NgModule({
  declarations: [AssistantComponent],
  exports: [AssistantComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfAssistantListItemModule,
    GfToggleModule,
    MatButtonModule,
    MatTabsModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAssistantModule {}
