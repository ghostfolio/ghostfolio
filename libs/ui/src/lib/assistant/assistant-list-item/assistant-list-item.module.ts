import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AssistantListItemComponent } from './assistant-list-item.component';

@NgModule({
  declarations: [AssistantListItemComponent],
  exports: [AssistantListItemComponent],
  imports: [CommonModule, RouterModule]
})
export class GfAssistantListItemModule {}
