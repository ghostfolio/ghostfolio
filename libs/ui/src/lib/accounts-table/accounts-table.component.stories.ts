import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfEntityLogoComponent } from '../entity-logo';
import { NotificationService } from '../notifications';
import { GfValueComponent } from '../value';
import { GfAccountsTableComponent } from './accounts-table.component';

const accounts = [
  {
    allocationInPercentage: null,
    balance: 278,
    balanceInBaseCurrency: 278,
    comment: null,
    createdAt: new Date('2025-06-01T06:52:49.063Z'),
    currency: 'USD',
    id: '460d7401-ca43-4ed4-b08e-349f1822e9db',
    isExcluded: false,
    name: 'Coinbase Account',
    platform: {
      id: '8dc24b88-bb92-4152-af25-fe6a31643e26',
      name: 'Coinbase',
      url: 'https://www.coinbase.com'
    },
    platformId: '8dc24b88-bb92-4152-af25-fe6a31643e26',
    transactionCount: 0,
    updatedAt: new Date('2025-06-01T06:52:49.063Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    value: 278,
    valueInBaseCurrency: 278
  },
  {
    allocationInPercentage: null,
    balance: 12000,
    balanceInBaseCurrency: 12000,
    comment: null,
    createdAt: new Date('2025-06-01T06:48:53.055Z'),
    currency: 'USD',
    id: '6d773e31-0583-4c85-a247-e69870b4f1ee',
    isExcluded: false,
    name: 'Private Banking Account',
    platform: {
      id: '43e8fcd1-5b79-4100-b678-d2229bd1660d',
      name: 'J.P. Morgan',
      url: 'https://www.jpmorgan.com'
    },
    platformId: '43e8fcd1-5b79-4100-b678-d2229bd1660d',
    transactionCount: 0,
    updatedAt: new Date('2025-06-01T06:48:53.055Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    value: 12000,
    valueInBaseCurrency: 12000
  },
  {
    allocationInPercentage: null,
    balance: 150.2,
    balanceInBaseCurrency: 150.2,
    comment: null,
    createdAt: new Date('2025-05-31T13:00:13.940Z'),
    currency: 'USD',
    id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    isExcluded: false,
    name: 'Trading Account',
    platform: {
      id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      name: 'Interactive Brokers',
      url: 'https://interactivebrokers.com'
    },
    platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
    transactionCount: 12,
    valueInBaseCurrency: 95693.70321466809,
    updatedAt: new Date('2025-06-01T06:53:10.569Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    value: 95693.70321466809
  }
];

export default {
  title: 'Accounts Table',
  component: GfAccountsTableComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        GfEntityLogoComponent,
        GfValueComponent,
        IonIcon,
        MatButtonModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        NgxSkeletonLoaderModule,
        RouterModule.forChild([])
      ],
      providers: [NotificationService]
    })
  ]
} as Meta<GfAccountsTableComponent>;

type Story = StoryObj<GfAccountsTableComponent>;

export const Loading: Story = {
  args: {
    accounts: undefined,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    showActions: false,
    showActivitiesCount: true,
    showAllocationInPercentage: false,
    showBalance: true,
    showFooter: true,
    showValue: true,
    showValueInBaseCurrency: true
  }
};

export const Default: Story = {
  args: {
    accounts,
    activitiesCount: 12,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    showActions: false,
    showActivitiesCount: true,
    showAllocationInPercentage: false,
    showBalance: true,
    showFooter: true,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 12428.2,
    totalValueInBaseCurrency: 107971.70321466809
  }
};

export const WithoutFooter: Story = {
  args: {
    accounts,
    activitiesCount: 12,
    baseCurrency: 'USD',
    deviceType: 'desktop',
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    showActions: false,
    showActivitiesCount: true,
    showAllocationInPercentage: false,
    showBalance: true,
    showFooter: false,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 12428.2,
    totalValueInBaseCurrency: 107971.70321466809
  }
};
