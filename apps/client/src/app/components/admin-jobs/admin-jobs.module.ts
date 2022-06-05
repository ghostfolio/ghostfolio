import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { AdminJobsComponent } from './admin-jobs.component';

@NgModule({
  declarations: [AdminJobsComponent],
  imports: [CommonModule, MatButtonModule, MatMenuModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminJobsModule {}
