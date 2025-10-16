import { CommonModule } from '@angular/common';
import '@angular/localize/init';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { holdings } from '../mocks/holdings';
import { GfTreemapChartComponent } from './treemap-chart.component';

export default {
  title: 'Treemap Chart',
  component: GfTreemapChartComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, NgxSkeletonLoaderModule]
    })
  ],
  argTypes: {
    colorScheme: {
      control: {
        type: 'select'
      },
      options: ['DARK', 'LIGHT']
    },
    cursor: {
      control: {
        type: 'select'
      },
      options: ['', 'pointer']
    }
  }
} as Meta<GfTreemapChartComponent>;

type Story = StoryObj<GfTreemapChartComponent>;

export const Default: Story = {
  args: {
    holdings,
    baseCurrency: 'USD',
    colorScheme: 'LIGHT',
    cursor: undefined,
    dateRange: 'mtd',
    locale: 'en-US'
  }
};
