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
import { GfValueComponent } from '../value';
import { GfHoldingsTableComponent } from './holdings-table.component';

const holdings = [
  {
    allocationInPercentage: 0.042990776363386086,
    assetClass: 'EQUITY' as any,
    assetClassLabel: 'Equity',
    assetSubClass: 'STOCK' as any,
    assetSubClassLabel: 'Stock',
    countries: [
      {
        code: 'US',
        weight: 1,
        continent: 'North America',
        name: 'United States'
      }
    ],
    currency: 'USD',
    dataSource: 'YAHOO' as any,
    dateOfFirstActivity: new Date('2021-12-01T00:00:00.000Z'),
    dividend: 0,
    grossPerformance: 3856,
    grossPerformancePercent: 0.46047289228564603,
    grossPerformancePercentWithCurrencyEffect: 0.46047289228564603,
    grossPerformanceWithCurrencyEffect: 3856,
    holdings: [],
    investment: 8374,
    marketPrice: 244.6,
    name: 'Apple Inc',
    netPerformance: 3855,
    netPerformancePercent: 0.460353475041796,
    netPerformancePercentWithCurrencyEffect: 0.460353475041796,
    netPerformanceWithCurrencyEffect: 3855,
    quantity: 50,
    sectors: [
      {
        name: 'Technology',
        weight: 1
      }
    ],
    symbol: 'AAPL',
    tags: [],
    transactionCount: 1,
    url: 'https://www.apple.com',
    valueInBaseCurrency: 12230
  },
  {
    allocationInPercentage: 0.02377401948293552,
    assetClass: 'EQUITY' as any,
    assetClassLabel: 'Equity',
    assetSubClass: 'STOCK' as any,
    assetSubClassLabel: 'Stock',
    countries: [
      {
        code: 'US',
        weight: 1,
        continent: 'North America',
        name: 'United States'
      }
    ],
    currency: 'USD',
    dataSource: 'YAHOO' as any,
    dateOfFirstActivity: new Date('2021-11-15T00:00:00.000Z'),
    dividend: 0,
    grossPerformance: 1250,
    grossPerformancePercent: 0.25000000000000006,
    grossPerformancePercentWithCurrencyEffect: 0.25000000000000006,
    grossPerformanceWithCurrencyEffect: 1250,
    holdings: [],
    investment: 5000,
    marketPrice: 125,
    name: 'Microsoft Corporation',
    netPerformance: 1250,
    netPerformancePercent: 0.25,
    netPerformancePercentWithCurrencyEffect: 0.25,
    netPerformanceWithCurrencyEffect: 1250,
    quantity: 50,
    sectors: [
      {
        name: 'Technology',
        weight: 1
      }
    ],
    symbol: 'MSFT',
    tags: [],
    transactionCount: 1,
    url: 'https://www.microsoft.com',
    valueInBaseCurrency: 6250
  },
  {
    allocationInPercentage: 0.015000000000000003,
    assetClass: 'EQUITY' as any,
    assetClassLabel: 'Equity',
    assetSubClass: 'STOCK' as any,
    assetSubClassLabel: 'Stock',
    countries: [
      {
        code: 'US',
        weight: 1,
        continent: 'North America',
        name: 'United States'
      }
    ],
    currency: 'USD',
    dataSource: 'YAHOO' as any,
    dateOfFirstActivity: new Date('2022-01-10T00:00:00.000Z'),
    dividend: 0,
    grossPerformance: -500,
    grossPerformancePercent: -0.1,
    grossPerformancePercentWithCurrencyEffect: -0.1,
    grossPerformanceWithCurrencyEffect: -500,
    holdings: [],
    investment: 5000,
    marketPrice: 90,
    name: 'Tesla Inc',
    netPerformance: -500,
    netPerformancePercent: -0.1,
    netPerformancePercentWithCurrencyEffect: -0.1,
    netPerformanceWithCurrencyEffect: -500,
    quantity: 50,
    sectors: [
      {
        name: 'Consumer Discretionary',
        weight: 1
      }
    ],
    symbol: 'TSLA',
    tags: [],
    transactionCount: 1,
    url: 'https://www.tesla.com',
    valueInBaseCurrency: 4500
  }
];

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

export const Default: Story = {
  args: {
    holdings,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: true,
    hasPermissionToShowQuantities: true,
    hasPermissionToShowValues: true,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};

export const WithoutQuantities: Story = {
  args: {
    holdings,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: true,
    hasPermissionToShowQuantities: false,
    hasPermissionToShowValues: true,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};

export const WithoutValues: Story = {
  args: {
    holdings,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: true,
    hasPermissionToShowQuantities: true,
    hasPermissionToShowValues: false,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};

export const Mobile: Story = {
  args: {
    holdings,
    baseCurrency: 'USD',
    deviceType: 'mobile',
    hasPermissionToOpenDetails: true,
    hasPermissionToShowQuantities: true,
    hasPermissionToShowValues: true,
    locale: 'en-US',
    pageSize: Number.MAX_SAFE_INTEGER
  }
};
