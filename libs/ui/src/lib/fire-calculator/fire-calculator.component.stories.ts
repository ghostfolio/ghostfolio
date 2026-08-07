import { DEFAULT_LOCALE } from '@ghostfolio/common/config';

import { CommonModule } from '@angular/common';
import { ANIMATION_MODULE_TYPE } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
        GfFireCalculatorComponent,
        GfValueComponent,
        MatButtonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        NgxSkeletonLoaderModule,
        ReactiveFormsModule
      ],
      providers: [
        FireCalculatorService,
        provideNativeDateAdapter(),
        {
          provide: ANIMATION_MODULE_TYPE,
          useValue: 'NoopAnimations'
        }
      ]
    })
  ]
} as Meta<GfFireCalculatorComponent>;

type Story = StoryObj<GfFireCalculatorComponent>;

export const Simple: Story = {
  args: {
    annualInterestRate: 5,
    currency: 'USD',
    fireWealth: 50000,
    locale: DEFAULT_LOCALE,
    savingsRate: 1000
  }
};
