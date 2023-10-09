import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AdminOverviewComponent } from './admin-overview.component';

@NgModule({
  declarations: [AdminOverviewComponent],
  exports: [],
  imports: [
    CommonModule,
    FormsModule,
    GfValueModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminOverviewModule {}
