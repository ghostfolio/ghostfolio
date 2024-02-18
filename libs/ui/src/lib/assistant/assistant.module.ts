import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
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
    GfSymbolIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAssistantModule {}
