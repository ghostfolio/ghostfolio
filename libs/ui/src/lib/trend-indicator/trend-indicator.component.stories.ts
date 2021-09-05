import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { TrendIndicatorComponent } from './trend-indicator.component';

export default {
  title: 'Trend Indicator',
  component: TrendIndicatorComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<TrendIndicatorComponent>;

const Template: Story<TrendIndicatorComponent> = (
  args: TrendIndicatorComponent
) => ({
  props: args
});

export const Loading = Template.bind({});
Loading.args = {
  isLoading: true
};

export const Default = Template.bind({});
Default.args = {};

export const Delayed = Template.bind({});
Delayed.args = {
  marketState: 'delayed',
  range: '1d'
};

export const Down = Template.bind({});
Down.args = {
  value: -1
};

export const Up = Template.bind({});
Up.args = {
  value: 1
};

export const MarketClosed = Template.bind({});
MarketClosed.args = {
  marketState: 'closed',
  range: '1d'
};
