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
import { GfValueComponent } from '../value';
import { GfAccountsTableComponent } from './accounts-table.component';

const mockAccounts = [
  {
    id: '1',
    name: 'Checking Account',
    currency: 'USD',
    balance: 15000,
    value: 15000,
    valueInBaseCurrency: 15000,
    transactionCount: 25,
    allocationInPercentage: 0.15,
    isExcluded: false,
    comment: 'Primary checking account',
    platform: {
      name: 'Bank of America',
      url: 'https://www.bankofamerica.com'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    platformId: 'bofa',
    userId: 'user1'
  },
  {
    id: '2',
    name: 'Trading Account',
    currency: 'USD',
    balance: 5000,
    value: 125000,
    valueInBaseCurrency: 125000,
    transactionCount: 127,
    allocationInPercentage: 0.65,
    isExcluded: false,
    comment: null,
    platform: {
      name: 'Interactive Brokers',
      url: 'https://www.interactivebrokers.com'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    platformId: 'ibkr',
    userId: 'user1'
  },
  {
    id: '3',
    name: 'Savings Account',
    currency: 'EUR',
    balance: 20000,
    value: 20000,
    valueInBaseCurrency: 21600,
    transactionCount: 8,
    allocationInPercentage: 0.2,
    isExcluded: false,
    comment: 'Emergency fund',
    platform: {
      name: 'Deutsche Bank',
      url: 'https://www.deutsche-bank.de'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    platformId: 'db',
    userId: 'user1'
  },
  {
    id: '4',
    name: 'Excluded Account',
    currency: 'USD',
    balance: 1000,
    value: 1000,
    valueInBaseCurrency: 1000,
    transactionCount: 3,
    allocationInPercentage: 0,
    isExcluded: true,
    comment: null,
    platform: {
      name: 'Local Credit Union',
      url: null
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    platformId: 'lcu',
    userId: 'user1'
  }
];

export default {
  title: 'Accounts Table',
  component: GfAccountsTableComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        NgxSkeletonLoaderModule,
        MatButtonModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        RouterModule.forRoot([]),
        IonIcon,
        GfEntityLogoComponent,
        GfValueComponent
      ]
    })
  ]
} as Meta<GfAccountsTableComponent>;

type Story = StoryObj<GfAccountsTableComponent>;

export const Loading: Story = {
  args: {
    accounts: [],
    baseCurrency: 'USD',
    deviceType: 'web',
    locale: 'en-US',
    showActions: false,
    showAllocationInPercentage: false,
    showBalance: true,
    showFooter: true,
    showTransactions: true,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 0,
    totalValueInBaseCurrency: 0,
    transactionCount: 0
  }
};

export const Default: Story = {
  args: {
    accounts: mockAccounts,
    baseCurrency: 'USD',
    deviceType: 'web',
    locale: 'en-US',
    showActions: false,
    showAllocationInPercentage: false,
    showBalance: true,
    showFooter: true,
    showTransactions: true,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 56600,
    totalValueInBaseCurrency: 161600,
    transactionCount: 163
  }
};

export const WithActions: Story = {
  args: {
    accounts: mockAccounts,
    baseCurrency: 'USD',
    deviceType: 'web',
    locale: 'en-US',
    showActions: true,
    showAllocationInPercentage: true,
    showBalance: true,
    showFooter: true,
    showTransactions: true,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 56600,
    totalValueInBaseCurrency: 161600,
    transactionCount: 163
  }
};

export const MobileView: Story = {
  args: {
    accounts: mockAccounts,
    baseCurrency: 'USD',
    deviceType: 'mobile',
    locale: 'en-US',
    showActions: false,
    showAllocationInPercentage: false,
    showBalance: false,
    showFooter: false,
    showTransactions: true,
    showValue: false,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 56600,
    totalValueInBaseCurrency: 161600,
    transactionCount: 163
  }
};

export const WithoutFooter: Story = {
  args: {
    accounts: mockAccounts,
    baseCurrency: 'USD',
    deviceType: 'web',
    locale: 'en-US',
    showActions: false,
    showAllocationInPercentage: true,
    showBalance: true,
    showFooter: false,
    showTransactions: true,
    showValue: true,
    showValueInBaseCurrency: true,
    totalBalanceInBaseCurrency: 56600,
    totalValueInBaseCurrency: 161600,
    transactionCount: 163
  }
};
