import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfTrendIndicatorComponent } from './trend-indicator.component';

export default {
  title: 'Trend Indicator',
  component: GfTrendIndicatorComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<GfTrendIndicatorComponent>;

type Story = StoryObj<GfTrendIndicatorComponent>;

export const Loading: Story = {
  args: {
    isLoading: true
  }
};

export const Default: Story = {
  args: {}
};

export const Delayed: Story = {
  args: {
    marketState: 'delayed',
    dateRange: '1d'
  }
};

export const Down: Story = {
  args: {
    value: -1
  }
};

export const Up: Story = {
  args: {
    value: 1
  }
};

export const MarketClosed: Story = {
  args: {
    marketState: 'closed',
    dateRange: '1d'
  }
};
