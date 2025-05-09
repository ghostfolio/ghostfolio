import { CommonModule } from '@angular/common';
import '@angular/localize/init';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfPortfolioProportionChartComponent } from './portfolio-proportion-chart.component';

export default {
  title: 'Portfolio Proportion Chart',
  component: GfPortfolioProportionChartComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        GfPortfolioProportionChartComponent,
        NgxSkeletonLoaderModule
      ]
    })
  ]
} as Meta<GfPortfolioProportionChartComponent>;

type Story = StoryObj<GfPortfolioProportionChartComponent>;

export const Simple: Story = {
  args: {
    baseCurrency: 'USD',
    data: {
      Africa: { name: 'Africa', value: 983.22461479889288 },
      Asia: { name: 'Asia', value: 12074.754633964973 },
      Europe: { name: 'Europe', value: 34432.837085290535 },
      'North America': { name: 'North America', value: 26539.89987780503 },
      Oceania: { name: 'Oceania', value: 1402.220605072031 },
      'South America': { name: 'South America', value: 4938.25202180719859 }
    },
    keys: ['name'],
    locale: 'en-US'
  }
};
