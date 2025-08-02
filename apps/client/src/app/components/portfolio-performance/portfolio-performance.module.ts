import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioPerformanceComponent } from './portfolio-performance.component';

@NgModule({
  declarations: [PortfolioPerformanceComponent],
  exports: [PortfolioPerformanceComponent],
  imports: [CommonModule, GfValueComponent, IonIcon, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioPerformanceModule {}
