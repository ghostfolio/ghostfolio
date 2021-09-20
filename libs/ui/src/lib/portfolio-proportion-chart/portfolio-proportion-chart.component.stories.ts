import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioProportionChartComponent } from './portfolio-proportion-chart.component';

export default {
  title: 'Value',
  component: PortfolioProportionChartComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<PortfolioProportionChartComponent>;

const Template: Story<PortfolioProportionChartComponent> = (
  args: PortfolioProportionChartComponent
) => ({
  props: args
});

export const Loading = Template.bind({});
Loading.args = {};
