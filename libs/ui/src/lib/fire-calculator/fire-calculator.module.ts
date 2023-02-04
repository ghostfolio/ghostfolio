import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueModule } from '../value';
import { FireCalculatorComponent } from './fire-calculator.component';
import { FireCalculatorService } from './fire-calculator.service';

@NgModule({
  declarations: [FireCalculatorComponent],
  exports: [FireCalculatorComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfValueModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  providers: [FireCalculatorService]
})
export class GfFireCalculatorModule {}
