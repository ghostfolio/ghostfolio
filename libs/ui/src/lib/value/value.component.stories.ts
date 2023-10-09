import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ValueComponent } from './value.component';

export default {
  title: 'Value',
  component: ValueComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<ValueComponent>;

const Template: Story<ValueComponent> = (args: ValueComponent) => ({
  props: args
});

export const Loading = Template.bind({});
Loading.args = {
  value: undefined
};

export const Currency = Template.bind({});
Currency.args = {
  isCurrency: true,
  locale: 'en-US',
  unit: 'USD',
  value: 7
};

export const Label = Template.bind({});
Label.args = {
  locale: 'en-US',
  value: 7.25
};

export const PerformancePositive = Template.bind({});
PerformancePositive.args = {
  locale: 'en-US',
  colorizeSign: true,
  isPercent: true,
  value: 0.0136810853673890378
};
PerformancePositive.storyName = 'Performance (positive)';

export const PerformanceNegative = Template.bind({});
PerformanceNegative.args = {
  locale: 'en-US',
  colorizeSign: true,
  isPercent: true,
  value: -0.0136810853673890378
};
PerformanceNegative.storyName = 'Performance (negative)';

export const PerformanceCloseToZero = Template.bind({});
PerformanceCloseToZero.args = {
  locale: 'en-US',
  colorizeSign: true,
  isPercent: true,
  value: -2.388915360475e-8
};
PerformanceCloseToZero.storyName = 'Performance (negative zero)';

export const Precision = Template.bind({});
Precision.args = {
  locale: 'en-US',
  precision: 3,
  value: 7.2534802394809285309
};
