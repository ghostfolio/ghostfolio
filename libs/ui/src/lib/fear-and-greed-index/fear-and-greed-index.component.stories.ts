import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfFearAndGreedIndexComponent } from './fear-and-greed-index.component';

export default {
  title: 'Fear & Greed Index',
  component: GfFearAndGreedIndexComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<GfFearAndGreedIndexComponent>;

type Story = StoryObj<GfFearAndGreedIndexComponent>;

export const Loading: Story = {
  args: {
    fearAndGreedIndex: undefined,
    isLoading: true
  }
};

export const Default: Story = {
  args: {
    fearAndGreedIndex: 50,
    isLoading: false
  }
};

export const Unknown: Story = {
  args: {
    fearAndGreedIndex: undefined,
    isLoading: false
  }
};
