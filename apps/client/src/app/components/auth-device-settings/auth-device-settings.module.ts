import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { AuthDeviceSettingsComponent } from './auth-device-settings.component';
import { MatPaginatorModule } from '@angular/material/paginator';

@NgModule({
  declarations: [AuthDeviceSettingsComponent],
  exports: [AuthDeviceSettingsComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    MatPaginatorModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAuthDeviceSettingsModule {}
