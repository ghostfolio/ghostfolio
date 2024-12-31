import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueComponent } from './value.component';

export default {
  title: 'Value',
  component: GfValueComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<GfValueComponent>;

type Story = StoryObj<GfValueComponent>;

export const Loading: Story = {
  args: {
    value: undefined
  }
};

export const Currency: Story = {
  args: {
    isCurrency: true,
    locale: 'en-US',
    unit: 'USD',
    value: 7
  }
};

export const Label: Story = {
  args: {
    locale: 'en-US',
    value: 7.25
  }
};

export const PerformancePositive: Story = {
  args: {
    locale: 'en-US',
    colorizeSign: true,
    isPercent: true,
    value: 0.0136810853673890378
  },
  storyName: 'Performance (positive)'
};

export const PerformanceNegative: Story = {
  args: {
    locale: 'en-US',
    colorizeSign: true,
    isPercent: true,
    value: -0.0136810853673890378
  },
  storyName: 'Performance (negative)'
};

export const PerformanceCloseToZero: Story = {
  args: {
    locale: 'en-US',
    colorizeSign: true,
    isPercent: true,
    value: -2.388915360475e-8
  },
  storyName: 'Performance (negative zero)'
};

export const Precision: Story = {
  args: {
    locale: 'en-US',
    precision: 3,
    value: 7.2534802394809285309
  }
};
