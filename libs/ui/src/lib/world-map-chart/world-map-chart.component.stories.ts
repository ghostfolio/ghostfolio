import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';

import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfWorldMapChartComponent } from './world-map-chart.component';

const VWRL_COUNTRY_ALLOCATION = {
  US: { name: 'United States', value: 60.5 },
  JP: { name: 'Japan', value: 5.2 },
  GB: { name: 'United Kingdom', value: 3.8 },
  CA: { name: 'Canada', value: 2.5 },
  FR: { name: 'France', value: 2.4 },
  CH: { name: 'Switzerland', value: 2.3 },
  DE: { name: 'Germany', value: 2.2 },
  AU: { name: 'Australia', value: 2.1 },
  CN: { name: 'China', value: 1.9 },
  IN: { name: 'India', value: 1.8 },
  TW: { name: 'Taiwan', value: 1.5 },
  KR: { name: 'South Korea', value: 1.4 },
  NL: { name: 'Netherlands', value: 1.3 },
  DK: { name: 'Denmark', value: 1.1 },
  SE: { name: 'Sweden', value: 1.0 }
};

export default {
  title: 'World Map Chart',
  component: GfWorldMapChartComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<GfWorldMapChartComponent>;

type Story = StoryObj<GfWorldMapChartComponent>;

export const Default: Story = {
  args: {
    countries: Object.fromEntries(
      Object.entries(VWRL_COUNTRY_ALLOCATION).map(([countryCode, country]) => {
        return [countryCode, { ...country, value: 150 * country.value }];
      })
    ),
    format: `{0} ${DEFAULT_CURRENCY}`,
    isInPercent: false
  }
};

export const InPercentage: Story = {
  args: {
    countries: VWRL_COUNTRY_ALLOCATION,
    format: '{0}%',
    isInPercent: true
  }
};
