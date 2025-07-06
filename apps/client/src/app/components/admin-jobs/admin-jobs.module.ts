import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AdminJobsComponent } from './admin-jobs.component';

@NgModule({
  declarations: [AdminJobsComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminJobsModule {}
