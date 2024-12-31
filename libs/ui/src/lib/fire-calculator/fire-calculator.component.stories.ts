import { locale } from '@ghostfolio/common/config';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueComponent } from '../value';
import { GfFireCalculatorComponent } from './fire-calculator.component';
import { FireCalculatorService } from './fire-calculator.service';

export default {
  title: 'FIRE Calculator',
  component: GfFireCalculatorComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        FormsModule,
        GfValueComponent,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        NgxSkeletonLoaderModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        GfFireCalculatorComponent
      ],
      providers: [FireCalculatorService, provideNativeDateAdapter()]
    })
  ]
} as Meta<GfFireCalculatorComponent>;

type Story = StoryObj<GfFireCalculatorComponent>;

export const Simple: Story = {
  args: {
    currency: 'USD',
    fireWealth: 0,
    locale: locale
  }
};
