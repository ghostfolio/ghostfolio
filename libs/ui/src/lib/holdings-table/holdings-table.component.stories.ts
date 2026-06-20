import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfEntityLogoComponent } from '../entity-logo';
import { holdings } from '../mocks/holdings';
import { GfValueComponent } from '../value';
import { GfHoldingsTableComponent } from './holdings-table.component';

export default {
  title: 'Holdings Table',
  component: GfHoldingsTableComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        GfEntityLogoComponent,
        GfValueComponent,
        MatButtonModule,
        MatDialogModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        NgxSkeletonLoaderModule
      ]
    })
  ]
} as Meta<GfHoldingsTableComponent>;

type Story = StoryObj<GfHoldingsTableComponent>;

export const Loading: Story = {
  args: {
    holdings: undefined,
    hasPermissionToOpenDetails: false,
    hasPermissionToShowQuantities: true,
    hasPermissionToShowValues: true,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};

export const Default: Story = {
  args: {
    holdings,
    hasPermissionToOpenDetails: false,
    hasPermissionToShowQuantities: true,
    hasPermissionToShowValues: true,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};
