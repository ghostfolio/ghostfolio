import { Activity } from '@ghostfolio/common/interfaces';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfActivityTypeComponent } from '../activity-type/activity-type.component';
import { GfEntityLogoComponent } from '../entity-logo';
import { GfNoTransactionsInfoComponent } from '../no-transactions-info/no-transactions-info.component';
import { NotificationService } from '../notifications';
import { GfValueComponent } from '../value';
import { GfActivitiesTableComponent } from './activities-table.component';

const activities: Activity[] = [
  {
    accountId: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    accountUserId: '081aa387-487d-4438-83a4-3060eb2a016e',
    comment: null,
    createdAt: new Date('2025-04-09T13:47:33.133Z'),
    currency: 'USD',
    date: new Date('2025-04-09T13:45:45.504Z'),
    fee: 1,
    id: 'a76968ff-80a4-4453-81ed-c3627dea3919',
    isDraft: false,
    quantity: 115,
    symbolProfileId: '21746431-d612-4298-911c-3099b2a43003',
    type: 'BUY',
    unitPrice: 103.543,
    updatedAt: new Date('2025-05-31T18:43:01.840Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    account: {
      balance: 150.2,
      comment: null,
      createdAt: new Date('2025-05-31T13:00:13.940Z'),
      currency: 'USD',
      id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
      isExcluded: false,
      name: 'Trading Account',
      platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      updatedAt: new Date('2025-06-01T06:53:10.569Z'),
      userId: '081aa387-487d-4438-83a4-3060eb2a016e',
      platform: {
        id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
        name: 'Interactive Brokers',
        url: 'https://interactivebrokers.com'
      }
    },
    SymbolProfile: {
      assetClass: 'EQUITY',
      assetSubClass: 'ETF',
      comment: undefined,
      countries: [],
      createdAt: new Date('2021-06-06T16:12:20.982Z'),
      currency: 'USD',
      cusip: '922042742',
      dataSource: 'YAHOO',
      figi: 'BBG000GM5FZ6',
      figiComposite: 'BBG000GM5FZ6',
      figiShareClass: 'BBG001T2YZG9',
      holdings: [],
      id: '21746431-d612-4298-911c-3099b2a43003',
      isActive: true,
      isin: 'US9220427424',
      name: 'Vanguard Total World Stock Index Fund ETF Shares',
      updatedAt: new Date('2025-10-01T20:09:39.500Z'),
      scraperConfiguration: undefined,
      sectors: [],
      symbol: 'VT',
      symbolMapping: {},
      url: 'https://www.vanguard.com',
      userId: undefined,
      activitiesCount: 267,
      dateOfFirstActivity: new Date('2018-05-31T16:00:00.000Z')
    },
    tags: [],
    feeInAssetProfileCurrency: 1,
    feeInBaseCurrency: 1,
    unitPriceInAssetProfileCurrency: 103.543,
    value: 11907.445,
    valueInBaseCurrency: 11907.445
  },
  {
    accountId: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    accountUserId: '081aa387-487d-4438-83a4-3060eb2a016e',
    comment: null,
    createdAt: new Date('2024-08-07T13:40:39.103Z'),
    currency: 'USD',
    date: new Date('2024-08-07T13:38:06.289Z'),
    fee: 2.97,
    id: '0c2f4fbf-6edc-4adc-8f83-abf8148500ec',
    isDraft: false,
    quantity: 105,
    symbolProfileId: '21746431-d612-4298-911c-3099b2a43003',
    type: 'BUY',
    unitPrice: 110.24,
    updatedAt: new Date('2025-05-31T18:46:14.175Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    account: {
      balance: 150.2,
      comment: null,
      createdAt: new Date('2025-05-31T13:00:13.940Z'),
      currency: 'USD',
      id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
      isExcluded: false,
      name: 'Trading Account',
      platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      updatedAt: new Date('2025-06-01T06:53:10.569Z'),
      userId: '081aa387-487d-4438-83a4-3060eb2a016e',
      platform: {
        id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
        name: 'Interactive Brokers',
        url: 'https://interactivebrokers.com'
      }
    },
    SymbolProfile: {
      assetClass: 'EQUITY',
      assetSubClass: 'ETF',
      comment: undefined,
      countries: [],
      createdAt: new Date('2021-06-06T16:12:20.982Z'),
      currency: 'USD',
      cusip: '922042742',
      dataSource: 'YAHOO',
      figi: 'BBG000GM5FZ6',
      figiComposite: 'BBG000GM5FZ6',
      figiShareClass: 'BBG001T2YZG9',
      holdings: [],
      id: '21746431-d612-4298-911c-3099b2a43003',
      isActive: true,
      isin: 'US9220427424',
      name: 'Vanguard Total World Stock Index Fund ETF Shares',
      updatedAt: new Date('2025-10-01T20:09:39.500Z'),
      scraperConfiguration: undefined,
      sectors: [],
      symbol: 'VT',
      symbolMapping: {},
      url: 'https://www.vanguard.com',
      userId: undefined,
      activitiesCount: 267,
      dateOfFirstActivity: new Date('2018-05-31T16:00:00.000Z')
    },
    tags: [],
    feeInAssetProfileCurrency: 2.97,
    feeInBaseCurrency: 2.97,
    unitPriceInAssetProfileCurrency: 110.24,
    value: 11575.2,
    valueInBaseCurrency: 11575.2
  },
  {
    accountId: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    accountUserId: '081aa387-487d-4438-83a4-3060eb2a016e',
    comment: null,
    createdAt: new Date('2024-03-12T15:15:21.217Z'),
    currency: 'USD',
    date: new Date('2024-03-12T15:14:38.597Z'),
    fee: 45.29,
    id: 'bfc92677-faf4-4d4f-9762-e0ec056525c2',
    isDraft: false,
    quantity: 167,
    symbolProfileId: '888d4123-db9a-42f3-9775-01b1ae6f9092',
    type: 'BUY',
    unitPrice: 41.0596,
    updatedAt: new Date('2025-05-31T18:49:54.064Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    account: {
      balance: 150.2,
      comment: null,
      createdAt: new Date('2025-05-31T13:00:13.940Z'),
      currency: 'USD',
      id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
      isExcluded: false,
      name: 'Trading Account',
      platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      updatedAt: new Date('2025-06-01T06:53:10.569Z'),
      userId: '081aa387-487d-4438-83a4-3060eb2a016e',
      platform: {
        id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
        name: 'Interactive Brokers',
        url: 'https://interactivebrokers.com'
      }
    },
    SymbolProfile: {
      assetClass: 'LIQUIDITY',
      assetSubClass: 'CRYPTOCURRENCY',
      comment: undefined,
      countries: [],
      createdAt: new Date('2024-03-12T15:15:21.217Z'),
      currency: 'USD',
      cusip: '463918102',
      dataSource: 'YAHOO',
      figi: 'BBG01KYQ6PV3',
      figiComposite: 'BBG01KYQ6PV3',
      figiShareClass: 'BBG01KYQ6QS5',
      holdings: [],
      id: '888d4123-db9a-42f3-9775-01b1ae6f9092',
      isActive: true,
      isin: 'CA4639181029',
      name: 'iShares Bitcoin Trust',
      updatedAt: new Date('2025-09-29T03:14:07.742Z'),
      scraperConfiguration: undefined,
      sectors: [],
      symbol: 'IBIT',
      symbolMapping: {},
      url: 'https://www.ishares.com',
      userId: undefined,
      activitiesCount: 6,
      dateOfFirstActivity: new Date('2024-01-01T08:00:00.000Z')
    },
    tags: [],
    feeInAssetProfileCurrency: 45.29,
    feeInBaseCurrency: 45.29,
    unitPriceInAssetProfileCurrency: 41.0596,
    value: 6856.9532,
    valueInBaseCurrency: 6856.9532
  },
  {
    accountId: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    accountUserId: '081aa387-487d-4438-83a4-3060eb2a016e',
    comment: null,
    createdAt: new Date('2024-02-23T15:53:46.907Z'),
    currency: 'USD',
    date: new Date('2024-02-23T15:53:15.745Z'),
    fee: 3,
    id: '7c9ceb54-acb1-4850-bfb1-adb41c29fd6a',
    isDraft: false,
    quantity: 81,
    symbolProfileId: '36effe43-7cb4-4e8b-b7ac-03ff65702cb9',
    type: 'BUY',
    unitPrice: 67.995,
    updatedAt: new Date('2025-05-31T18:48:48.209Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    account: {
      balance: 150.2,
      comment: null,
      createdAt: new Date('2025-05-31T13:00:13.940Z'),
      currency: 'USD',
      id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
      isExcluded: false,
      name: 'Trading Account',
      platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      updatedAt: new Date('2025-06-01T06:53:10.569Z'),
      userId: '081aa387-487d-4438-83a4-3060eb2a016e',
      platform: {
        id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
        name: 'Interactive Brokers',
        url: 'https://interactivebrokers.com'
      }
    },
    SymbolProfile: {
      assetClass: 'FIXED_INCOME',
      assetSubClass: 'BOND',
      comment: 'No data',
      countries: [],
      createdAt: new Date('2022-04-13T20:05:47.301Z'),
      currency: 'USD',
      cusip: '92206C565',
      dataSource: 'YAHOO',
      figi: 'BBG00LWSF7T3',
      figiComposite: 'BBG00LWSF7T3',
      figiShareClass: 'BBG00LWSF8K0',
      holdings: [],
      id: '36effe43-7cb4-4e8b-b7ac-03ff65702cb9',
      isActive: true,
      isin: 'US92206C5655',
      name: 'Vanguard Total World Bond ETF',
      updatedAt: new Date('2025-10-02T06:02:56.314Z'),

      sectors: [],
      symbol: 'BNDW',
      symbolMapping: {},
      url: 'https://vanguard.com',
      userId: undefined,
      activitiesCount: 38,
      dateOfFirstActivity: new Date('2022-04-13T20:05:48.742Z')
    },
    tags: [],
    feeInAssetProfileCurrency: 3,
    feeInBaseCurrency: 3,
    unitPriceInAssetProfileCurrency: 67.995,
    value: 5507.595,
    valueInBaseCurrency: 5507.595
  },
  {
    accountId: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
    accountUserId: '081aa387-487d-4438-83a4-3060eb2a016e',
    comment: null,
    createdAt: new Date('2023-01-11T14:35:22.325Z'),
    currency: 'USD',
    date: new Date('2023-01-11T14:34:55.174Z'),
    fee: 7.38,
    id: '3fe87b3f-78de-407a-bc02-4189b221051f',
    isDraft: false,
    quantity: 55,
    symbolProfileId: '21746431-d612-4298-911c-3099b2a43003',
    type: 'BUY',
    unitPrice: 89.48,
    updatedAt: new Date('2025-05-31T18:46:44.616Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e',
    account: {
      balance: 150.2,
      comment: null,
      createdAt: new Date('2025-05-31T13:00:13.940Z'),
      currency: 'USD',
      id: '776bd1e9-b2f6-4f7e-933d-18756c2f0625',
      isExcluded: false,
      name: 'Trading Account',
      platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      updatedAt: new Date('2025-06-01T06:53:10.569Z'),
      userId: '081aa387-487d-4438-83a4-3060eb2a016e',
      platform: {
        id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
        name: 'Interactive Brokers',
        url: 'https://interactivebrokers.com'
      }
    },
    SymbolProfile: {
      assetClass: 'EQUITY',
      assetSubClass: 'ETF',
      comment: undefined,
      countries: [],
      createdAt: new Date('2021-06-06T16:12:20.982Z'),
      currency: 'USD',
      cusip: '922042742',
      dataSource: 'YAHOO',
      figi: 'BBG000GM5FZ6',
      figiComposite: 'BBG000GM5FZ6',
      figiShareClass: 'BBG001T2YZG9',
      holdings: [],
      id: '21746431-d612-4298-911c-3099b2a43003',
      isActive: true,
      isin: 'US9220427424',
      name: 'Vanguard Total World Stock Index Fund ETF Shares',
      updatedAt: new Date('2025-10-01T20:09:39.500Z'),
      scraperConfiguration: undefined,
      sectors: [],
      symbol: 'VT',
      symbolMapping: {},
      url: 'https://www.vanguard.com',
      userId: undefined,
      activitiesCount: 267,
      dateOfFirstActivity: new Date('2018-05-31T16:00:00.000Z')
    },
    tags: [],
    feeInAssetProfileCurrency: 7.38,
    feeInBaseCurrency: 7.38,
    unitPriceInAssetProfileCurrency: 89.48,
    value: 4921.4,
    valueInBaseCurrency: 4921.4
  }
];

const dataSource = new MatTableDataSource<Activity>(activities);

export default {
  title: 'Activities Table',
  component: GfActivitiesTableComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        GfActivityTypeComponent,
        GfEntityLogoComponent,
        GfNoTransactionsInfoComponent,
        GfSymbolPipe,
        GfValueComponent,
        IonIcon,
        MatButtonModule,
        MatCheckboxModule,
        MatMenuModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        NgxSkeletonLoaderModule,
        RouterModule.forChild([])
      ],
      providers: [NotificationService]
    })
  ]
} as Meta<GfActivitiesTableComponent>;

type Story = StoryObj<GfActivitiesTableComponent>;

export const Loading: Story = {
  args: {
    baseCurrency: 'USD',
    dataSource: undefined,
    deviceType: 'desktop',
    hasActivities: true,
    hasPermissionToCreateActivity: false,
    hasPermissionToDeleteActivity: false,
    hasPermissionToExportActivities: false,
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    pageIndex: 0,
    pageSize: 10,
    showAccountColumn: true,
    showActions: false,
    showCheckbox: false,
    showNameColumn: true,
    sortColumn: 'date',
    sortDirection: 'desc',
    sortDisabled: false,
    totalItems: 0
  }
};

export const Default: Story = {
  args: {
    baseCurrency: 'USD',
    dataSource,
    deviceType: 'desktop',
    hasActivities: true,
    hasPermissionToCreateActivity: false,
    hasPermissionToDeleteActivity: false,
    hasPermissionToExportActivities: false,
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    pageIndex: 0,
    pageSize: 10,
    showAccountColumn: true,
    showActions: false,
    showCheckbox: false,
    showNameColumn: true,
    sortColumn: 'date',
    sortDirection: 'desc',
    sortDisabled: false,
    totalItems: activities.length
  }
};

export const Pagination: Story = {
  args: {
    baseCurrency: 'USD',
    dataSource: new MatTableDataSource<Activity>(
      Array.from({ length: 50 }).map((_, i) => ({
        ...(activities[i % activities.length] as Activity),
        date: new Date(2025, 5, (i % 28) + 1),
        id: `${i}`
      }))
    ),
    deviceType: 'desktop',
    hasActivities: true,
    hasPermissionToCreateActivity: false,
    hasPermissionToDeleteActivity: false,
    hasPermissionToExportActivities: false,
    hasPermissionToOpenDetails: false,
    locale: 'en-US',
    pageIndex: 0,
    pageSize: 10,
    showAccountColumn: true,
    showActions: false,
    showCheckbox: false,
    showNameColumn: true,
    sortColumn: 'date',
    sortDirection: 'desc',
    sortDisabled: false,
    totalItems: 50
  }
};
