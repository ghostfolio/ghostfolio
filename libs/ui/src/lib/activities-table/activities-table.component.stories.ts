import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { GfSymbolPipe } from '@ghostfolio/client/pipes/symbol/symbol.pipe';

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
import { NotificationService } from 'apps/client/src/app/core/notification/notification.service';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfActivityTypeComponent } from '../activity-type/activity-type.component';
import { GfEntityLogoComponent } from '../entity-logo';
import { GfNoTransactionsInfoComponent } from '../no-transactions-info/no-transactions-info.component';
import { GfValueComponent } from '../value';
import { GfActivitiesTableComponent } from './activities-table.component';

const activities: Activity[] = [
  {
    id: '383d25b0-cff4-4b66-8bb7-8244cb787ca5' as any,
    type: 'BUY',
    date: new Date('2025-06-01T10:00:00.000Z') as any,
    quantity: 10 as any,
    fee: 1 as any,
    feeInAssetProfileCurrency: 1,
    feeInBaseCurrency: 1,
    unitPrice: 250 as any,
    unitPriceInAssetProfileCurrency: 250,
    value: 2500,
    valueInBaseCurrency: 2500,
    currency: 'USD' as any,
    isDraft: false as any,
    account: {
      id: 'b73d7d6f-88b6-45f1-a1b2-27c1182fed81' as any,
      name: 'Brokerage Account' as any,
      platform: {
        id: '7fececf6-9bf1-4318-ad1f-1d61e357a8c1' as any,
        name: 'Interactive Brokers' as any,
        url: 'https://interactivebrokers.com' as any
      }
    } as any,
    SymbolProfile: {
      dataSource: 'YAHOO' as any,
      symbol: 'AAPL' as any,
      name: 'Apple Inc.' as any
    } as any
  } as any,
  {
    id: '7ccf3e14-9fc3-4237-b6e7-831e185b9f76' as any,
    type: 'DIVIDEND',
    date: new Date('2025-06-10T10:00:00.000Z') as any,
    quantity: 0 as any,
    fee: 0 as any,
    feeInAssetProfileCurrency: 0,
    feeInBaseCurrency: 0,
    unitPrice: 0 as any,
    unitPriceInAssetProfileCurrency: 0,
    value: 15.5,
    valueInBaseCurrency: 15.5,
    currency: 'USD' as any,
    isDraft: false as any,
    account: {
      id: '54927ef3-ee2b-488f-b72e-a42b16c57a16' as any,
      name: 'Brokerage Account' as any,
      platform: {
        id: 'fa43c986-6638-42db-85f9-015c6b83f730' as any,
        name: 'Interactive Brokers' as any,
        url: 'https://interactivebrokers.com' as any
      }
    } as any,
    SymbolProfile: {
      dataSource: 'YAHOO' as any,
      symbol: 'AAPL' as any,
      name: 'Apple Inc.' as any
    } as any
  } as any,
  {
    id: '84ebfe47-14bc-4b26-88e4-4d3224bb453c' as any,
    type: 'SELL',
    date: new Date('2025-06-15T10:00:00.000Z') as any,
    quantity: 5 as any,
    fee: 1 as any,
    feeInAssetProfileCurrency: 1,
    feeInBaseCurrency: 1,
    unitPrice: 300 as any,
    unitPriceInAssetProfileCurrency: 300,
    value: 1500,
    valueInBaseCurrency: 1500,
    currency: 'USD' as any,
    isDraft: false as any,
    account: {
      id: '169abccc-fc0d-49a4-9be2-4b3d6ef4d21f' as any,
      name: 'Trading Account' as any,
      platform: {
        id: 'a02bcac9-cd82-48fb-8b89-3670f1ad8841' as any,
        name: 'Robinhood' as any,
        url: 'https://robinhood.com' as any
      }
    } as any,
    SymbolProfile: {
      dataSource: 'YAHOO' as any,
      symbol: 'MSFT' as any,
      name: 'Microsoft Corp.' as any
    } as any
  } as any
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
    hasPermissionToOpenDetails: true,
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
    hasPermissionToOpenDetails: true,
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

export const EmptyState: Story = {
  args: {
    baseCurrency: 'USD',
    dataSource: new MatTableDataSource<Activity>([]),
    deviceType: 'desktop',
    hasActivities: false,
    hasPermissionToCreateActivity: true,
    hasPermissionToDeleteActivity: false,
    hasPermissionToExportActivities: false,
    hasPermissionToOpenDetails: true,
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

export const ManyRows: Story = {
  args: {
    baseCurrency: 'USD',
    dataSource: new MatTableDataSource<Activity>(
      Array.from({ length: 50 }).map((_, i) => ({
        ...(activities[i % activities.length] as Activity),
        id: `${i}` as any,
        date: new Date(2025, 5, (i % 28) + 1) as any
      }))
    ),
    deviceType: 'desktop',
    hasActivities: true,
    hasPermissionToCreateActivity: false,
    hasPermissionToDeleteActivity: false,
    hasPermissionToExportActivities: false,
    hasPermissionToOpenDetails: true,
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
