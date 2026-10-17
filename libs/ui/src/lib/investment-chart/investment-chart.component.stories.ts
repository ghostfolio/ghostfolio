import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfInvestmentChartComponent } from './investment-chart.component';

export default {
  title: 'Investment Chart',
  component: GfInvestmentChartComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<GfInvestmentChartComponent>;

type Story = StoryObj<GfInvestmentChartComponent>;

export const InvestmentsByMonth: Story = {
  args: {
    benchmarkDataItems: [
      {
        date: '2025-01-01',
        investment: 1000
      },
      {
        date: '2025-02-01',
        investment: 1000
      },
      {
        date: '2025-03-01',
        investment: 500
      },
      {
        date: '2025-04-01',
        investment: 1500
      },
      {
        date: '2025-05-01',
        investment: -2500
      },
      {
        date: '2025-06-01',
        investment: 1000
      },
      {
        date: '2025-07-01',
        investment: 0
      },
      {
        date: '2025-08-01',
        investment: 2000
      },
      {
        date: '2025-09-01',
        investment: 1000
      },
      {
        date: '2025-10-01',
        investment: -800
      },
      {
        date: '2025-11-01',
        investment: 1000
      },
      {
        date: '2025-12-01',
        investment: 1200
      }
    ],
    benchmarkDataLabel: 'Invested Capital',
    currency: 'USD',
    groupBy: 'month',
    locale: 'en-US'
  }
};

export const PerformanceByYear: Story = {
  args: {
    benchmarkDataItems: [
      {
        date: '2015-01-01',
        investment: -0.02783300898051616
      },
      {
        date: '2016-01-01',
        investment: 0.2955008663975502
      },
      {
        date: '2017-01-01',
        investment: 0.5581973009289353
      },
      {
        date: '2018-01-01',
        investment: -0.27056776062551113
      },
      {
        date: '2019-01-01',
        investment: 0.27802802888773426
      },
      {
        date: '2020-01-01',
        investment: 0.11264960377555408
      },
      {
        date: '2021-01-01',
        investment: 0.31365756351078433
      },
      {
        date: '2022-01-01',
        investment: -0.23865494728984496
      },
      {
        date: '2023-01-01',
        investment: 0.07752911954819477
      },
      {
        date: '2024-01-01',
        investment: 0.24854314905668837
      },
      {
        date: '2025-01-01',
        investment: 0.05351048565996891
      },
      {
        date: '2026-01-01',
        investment: 0.1037188655512382
      }
    ],
    benchmarkDataLabel: 'Net Performance',
    groupBy: 'year',
    highlightNegativeValues: true,
    isInPercentage: true
  }
};
