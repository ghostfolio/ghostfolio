import { locale } from '@ghostfolio/common/config';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueModule } from '../value';
import { FireCalculatorComponent } from './fire-calculator.component';
import { FireCalculatorService } from './fire-calculator.service';

export default {
  title: 'FIRE Calculator',
  component: FireCalculatorComponent,
  decorators: [
    moduleMetadata({
      declarations: [FireCalculatorComponent],
      imports: [
        CommonModule,
        FormsModule,
        GfValueModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        NgxSkeletonLoaderModule,
        NoopAnimationsModule,
        ReactiveFormsModule
      ],
      providers: [FireCalculatorService]
    })
  ]
} as Meta<FireCalculatorComponent>;

const Template: Story<FireCalculatorComponent> = (
  args: FireCalculatorComponent
) => ({
  props: args
});

export const Simple = Template.bind({});
Simple.args = {
  currency: 'USD',
  fireWealth: 0,
  locale: locale
};
