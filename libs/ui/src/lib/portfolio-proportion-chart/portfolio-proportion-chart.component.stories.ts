import { CommonModule } from '@angular/common';
import '@angular/localize/init';
import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioProportionChartComponent } from './portfolio-proportion-chart.component';

export default {
  title: 'Portfolio Proportion Chart',
  component: PortfolioProportionChartComponent,
  decorators: [
    moduleMetadata({
      declarations: [PortfolioProportionChartComponent],
      imports: [CommonModule, NgxSkeletonLoaderModule]
    })
  ]
} as Meta<PortfolioProportionChartComponent>;

const Template: Story<PortfolioProportionChartComponent> = (
  args: PortfolioProportionChartComponent
) => ({
  props: args
});

export const Simple = Template.bind({});
Simple.args = {
  baseCurrency: 'USD',
  keys: ['name'],
  locale: 'en-US',
  positions: {
    Africa: { name: 'Africa', value: 983.22461479889288 },
    Asia: { name: 'Asia', value: 12074.754633964973 },
    Europe: { name: 'Europe', value: 34432.837085290535 },
    'North America': { name: 'North America', value: 26539.89987780503 },
    Oceania: { name: 'Oceania', value: 1402.220605072031 },
    'South America': { name: 'South America', value: 4938.25202180719859 }
  }
};
