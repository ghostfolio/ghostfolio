import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { ToolsPageRoutingModule } from './tools-page-routing.module';
import { ToolsPageComponent } from './tools-page.component';

@NgModule({
  declarations: [ToolsPageComponent],
  exports: [],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    ToolsPageRoutingModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ToolsPageModule {}
