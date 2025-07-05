import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { AccessTableComponent } from './access-table.component';

@NgModule({
  declarations: [AccessTableComponent],
  exports: [AccessTableComponent],
  imports: [
    ClipboardModule,
    CommonModule,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioAccessTableModule {}
