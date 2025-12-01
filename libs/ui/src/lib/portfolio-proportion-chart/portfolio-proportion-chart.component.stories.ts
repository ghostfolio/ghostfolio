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

export const Default: Story = {
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

export const InPercentage: Story = {
  args: {
    data: {
      US: { name: 'United States', value: 0.6515000000000001 },
      NL: { name: 'Netherlands', value: 0.006 },
      DE: { name: 'Germany', value: 0.0031 },
      GB: { name: 'United Kingdom', value: 0.0124 },
      CA: { name: 'Canada', value: 0.0247 },
      IE: { name: 'Ireland', value: 0.0112 },
      SE: { name: 'Sweden', value: 0.0016 },
      ES: { name: 'Spain', value: 0.0042 },
      AU: { name: 'Australia', value: 0.0022 },
      FR: { name: 'France', value: 0.0012 },
      UY: { name: 'Uruguay', value: 0.0012 },
      CH: { name: 'Switzerland', value: 0.004099999999999999 },
      LU: { name: 'Luxembourg', value: 0.0012 },
      BR: { name: 'Brazil', value: 0.0006 },
      HK: { name: 'Hong Kong', value: 0.0006 },
      IT: { name: 'Italy', value: 0.0005 },
      CN: { name: 'China', value: 0.002 },
      KR: { name: 'South Korea', value: 0.0006 },
      BM: { name: 'Bermuda', value: 0.0011 },
      ZA: { name: 'South Africa', value: 0.0004 },
      SG: { name: 'Singapore', value: 0.0003 },
      IL: { name: 'Israel', value: 0.001 },
      DK: { name: 'Denmark', value: 0.0002 },
      PE: { name: 'Peru', value: 0.0002 },
      NO: { name: 'Norway', value: 0.0002 },
      KY: { name: 'Cayman Islands', value: 0.0001 },
      IN: { name: 'India', value: 0.0001 },
      TW: { name: 'Taiwan', value: 0.0002 },
      GR: { name: 'Greece', value: 0.0001 },
      CL: { name: 'Chile', value: 0.0001 },
      MX: { name: 'Mexico', value: 0 },
      RU: { name: 'Russia', value: 0 },
      IS: { name: 'Iceland', value: 0 },
      JP: { name: 'Japan', value: 0 },
      BE: { name: 'Belgium', value: 0 }
    },
    isInPercent: true,
    keys: ['name']
  }
};
