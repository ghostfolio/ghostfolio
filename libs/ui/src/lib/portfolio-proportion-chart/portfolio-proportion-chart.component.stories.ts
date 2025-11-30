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
      US: { name: 'United States', value: 0.6765460372338868 },
      NL: { name: 'Netherlands', value: 0.013 },
      DE: { name: 'Germany', value: 0.0103 },
      GB: { name: 'United Kingdom', value: 0.0198 },
      CA: { name: 'Canada', value: 0.0324 },
      IE: { name: 'Ireland', value: 0.0186 },
      SE: { name: 'Sweden', value: 0.0087 },
      ES: { name: 'Spain', value: 0.0114 },
      AU: { name: 'Australia', value: 0.0093 },
      FR: { name: 'France', value: 0.0083 },
      UY: { name: 'Uruguay', value: 0.0083 },
      CH: { name: 'Switzerland', value: 0.011253962766113295 },
      LU: { name: 'Luxembourg', value: 0.0083 },
      BR: { name: 'Brazil', value: 0.0077 },
      HK: { name: 'Hong Kong', value: 0.0077 },
      IT: { name: 'Italy', value: 0.0075 },
      CN: { name: 'China', value: 0.009 },
      KR: { name: 'South Korea', value: 0.0077 },
      BM: { name: 'Bermuda', value: 0.0082 },
      ZA: { name: 'South Africa', value: 0.0075 },
      SG: { name: 'Singapore', value: 0.0074 },
      IL: { name: 'Israel', value: 0.008 },
      DK: { name: 'Denmark', value: 0.0073 },
      PE: { name: 'Peru', value: 0.0073 },
      NO: { name: 'Norway', value: 0.0073 },
      KY: { name: 'Cayman Islands', value: 0.0072 },
      IN: { name: 'India', value: 0.0072 },
      TW: { name: 'Taiwan', value: 0.0073 },
      GR: { name: 'Greece', value: 0.0072 },
      CL: { name: 'Chile', value: 0.0072 },
      MX: { name: 'Mexico', value: 0.007 },
      RU: { name: 'Russia', value: 0.007 },
      IS: { name: 'Iceland', value: 0.007 },
      JP: { name: 'Japan', value: 0.007 },
      BE: { name: 'Belgium', value: 0.007 }
    },
    isInPercent: true,
    keys: ['name']
  }
};
