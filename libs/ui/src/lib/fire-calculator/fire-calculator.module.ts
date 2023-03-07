import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FireCalculatorComponent } from './fire-calculator.component';
import { FireCalculatorService } from './fire-calculator.service';

@NgModule({
  declarations: [FireCalculatorComponent],
  exports: [FireCalculatorComponent],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  providers: [FireCalculatorService]
})
export class GfFireCalculatorModule {}
