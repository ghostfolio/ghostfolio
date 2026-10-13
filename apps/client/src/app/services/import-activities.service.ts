import {
  CASH_FLOW_ACTIVITY_TYPES,
  NON_INVESTMENT_ACTIVITY_TYPES
} from '@ghostfolio/common/config';
import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreatePlatformDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';
import {
  isValidCustomAssetProfileSymbol,
  parseDate as parseDateHelper
} from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import type { Account } from '@ghostfolio/prisma/browser';
import { DataSource, Type as ActivityType } from '@ghostfolio/prisma/enums';

import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { isDate, isFinite, isNumber, isString } from 'lodash-es';
import { parse as csvToJson } from 'papaparse';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Service()
export class ImportActivitiesService {
  private static ACCOUNT_KEYS = ['account', 'accountid'];
  private static COMMENT_KEYS = ['comment', 'note'];
  private static CURRENCY_KEYS = ['ccy', 'currency', 'currencyprimary'];
  private static DATA_SOURCE_KEYS = ['datasource'];
  private static DATE_KEYS = ['date', 'tradedate'];
  private static FEE_KEYS = ['commission', 'fee', 'ibcommission'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'buy/sell', 'type'];
  private static UPDATE_ACCOUNT_BALANCE_KEYS = [
    'updateaccountbalance',
    'update_account_balance'
  ];
  private static UNIT_PRICE_KEYS = [
    'price',
    'tradeprice',
    'unitprice',
    'value'
  ];

  private readonly http = inject(HttpClient);

  /**
   * Gives the number of the lines of a CSV file which are not empty, without
   * the first line
   */
  public getDataRowCountOfCsv(fileContent: string) {
    const lineCount = fileContent.split(/\r\n|\r|\n/).filter((line) => {
      return line.trim().length > 0;
    }).length;

    return Math.max(lineCount - 1, 0);
  }

  public async importCsv({
    fileContent,
    isDryRun = false,
    userAccounts
  }: {
    fileContent: string;
    isDryRun?: boolean;
    userAccounts: Account[];
  }): Promise<{
    activities: Activity[];
    assetProfiles: CreateAssetProfileWithMarketDataDto[];
  }> {
    const content = csvToJson<Record<string, unknown>>(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    const activities: CreateOrderDto[] = [];
    const assetProfiles: CreateAssetProfileWithMarketDataDto[] = [];
    const assetProfileSymbolMapping = new Map<string, string>();

    for (const [index, item] of content.entries()) {
      const currency = this.parseCurrency({ content, index, item });
      const type = this.parseType({ content, index, item });
      const isCashFlow = CASH_FLOW_ACTIVITY_TYPES.includes(type);
      const accountId = this.parseAccount({
        currency,
        item,
        type,
        userAccounts
      });
      const updateAccountBalance =
        this.parseUpdateAccountBalance({ content, index, item }) ??
        (isCashFlow ? !!accountId : undefined);

      let dataSource = this.parseDataSource({ item });
      let symbol = this.parseSymbol({ content, index, item, type });

      if (isCashFlow) {
        dataSource = DataSource.MANUAL;
      }

      if (!dataSource && NON_INVESTMENT_ACTIVITY_TYPES.includes(type)) {
        // Apply the same data source as the import service
        dataSource = DataSource.MANUAL;
      }

      if (dataSource === DataSource.MANUAL) {
        const name = symbol;

        if (!isValidCustomAssetProfileSymbol(symbol)) {
          // Generate a symbol and keep the free text as the name
          symbol = assetProfileSymbolMapping.get(name) ?? uuidv4();
          assetProfileSymbolMapping.set(name, symbol);
        }

        const isExistingAssetProfile = assetProfiles.some((assetProfile) => {
          return assetProfile.symbol === symbol;
        });

        if (!isExistingAssetProfile) {
          // Create synthetic asset profile for MANUAL data source
          assetProfiles.push({
            currency,
            name,
            symbol,
            assetClass: undefined,
            assetSubClass: undefined,
            comment: undefined,
            countries: [],
            cusip: undefined,
            dataSource: DataSource.MANUAL,
            figi: undefined,
            figiComposite: undefined,
            figiShareClass: undefined,
            holdings: [],
            isActive: true,
            isin: undefined,
            marketData: [],
            sectors: [],
            url: undefined
          });
        }
      }

      activities.push({
        currency,
        dataSource,
        symbol,
        type,
        accountId,
        comment: this.parseComment({ item }),
        date: this.parseDate({ content, index, item, type }),
        fee: isCashFlow ? 0 : this.parseFee({ content, index, item }),
        quantity: isCashFlow ? 1 : this.parseQuantity({ content, index, item }),
        unitPrice: this.parseUnitPrice({ content, index, item, type }),
        ...(updateAccountBalance === undefined ? {} : { updateAccountBalance })
      });
    }

    if (userAccounts.length === 1) {
      const account = userAccounts[0];
      const hasCashMovementsForAccount = activities.some(
        ({ accountId, type }) => {
          return (
            accountId === account.id && CASH_FLOW_ACTIVITY_TYPES.includes(type)
          );
        }
      );

      if (hasCashMovementsForAccount) {
        const cashAffectingActivityTypes: ActivityType[] = [
          ActivityType.BUY,
          ActivityType.SELL,
          ActivityType.DIVIDEND,
          ActivityType.INTEREST,
          ActivityType.FEE
        ];

        for (const [index, activity] of activities.entries()) {
          const item = this.lowercaseKeys(content[index]);
          const hasExplicitAccount = ImportActivitiesService.ACCOUNT_KEYS.some(
            (key) => {
              const value = item[key];

              return isNumber(value) || (isString(value) && !!value.trim());
            }
          );

          if (
            !activity.accountId &&
            !hasExplicitAccount &&
            activity.currency === account.currency &&
            cashAffectingActivityTypes.includes(activity.type)
          ) {
            activity.accountId = account.id;
          }
        }
      }
    }

    const result = await this.importJson({
      activities,
      assetProfiles,
      isDryRun
    });
    return { ...result, assetProfiles };
  }

  public importJson({
    accounts,
    activities,
    assetProfiles,
    isDryRun = false,
    platforms,
    tags
  }: {
    activities: CreateOrderDto[];
    accounts?: CreateAccountWithBalancesDto[];
    assetProfiles?: CreateAssetProfileWithMarketDataDto[];
    isDryRun?: boolean;
    platforms?: CreatePlatformDto[];
    tags?: CreateTagDto[];
  }): Promise<{
    activities: Activity[];
  }> {
    return firstValueFrom(
      this.postImport(
        {
          accounts,
          activities,
          assetProfiles,
          platforms,
          tags
        },
        isDryRun
      )
    );
  }

  public importSelectedActivities({
    accounts,
    activities,
    assetProfiles,
    platforms,
    tags
  }: {
    accounts?: CreateAccountWithBalancesDto[];
    activities: Activity[];
    assetProfiles?: CreateAssetProfileWithMarketDataDto[];
    platforms?: CreatePlatformDto[];
    tags?: CreateTagDto[];
  }): Promise<{
    activities: Activity[];
  }> {
    const importData = activities.map((activity) =>
      this.convertToCreateOrderDto(activity)
    );

    return this.importJson({
      accounts,
      assetProfiles,
      platforms,
      tags,
      activities: importData
    });
  }

  private convertToCreateOrderDto({
    accountId,
    assetProfile,
    comment,
    currency,
    date,
    fee,
    quantity,
    tags,
    type,
    unitPrice,
    updateAccountBalance
  }: Activity): CreateOrderDto {
    return {
      fee,
      quantity,
      type,
      unitPrice,
      updateAccountBalance,
      accountId: accountId ?? undefined,
      comment: comment ?? undefined,
      currency: currency ?? assetProfile.currency ?? '',
      dataSource: assetProfile.dataSource,
      date: date.toString(),
      symbol: assetProfile.symbol,
      tags: tags?.map(({ id }) => {
        return id;
      })
    };
  }

  private lowercaseKeys(
    aObject: Record<string, unknown>
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(aObject).map(([key, val]) => {
        return [key.toLowerCase(), val];
      })
    );
  }

  private parseAccount({
    currency,
    item,
    type,
    userAccounts
  }: {
    currency: string;
    item: Record<string, unknown>;
    type: ActivityType;
    userAccounts: Account[];
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.ACCOUNT_KEYS) {
      const value = item[key];

      if (isNumber(value) || (isString(value) && value.trim())) {
        return userAccounts.find(({ id, name }) => {
          return (
            id === value ||
            name?.toLowerCase() === String(value).trim().toLowerCase()
          );
        })?.id;
      }
    }

    if (
      CASH_FLOW_ACTIVITY_TYPES.includes(type) &&
      userAccounts.length === 1 &&
      userAccounts[0].currency === currency
    ) {
      return userAccounts[0].id;
    }

    return undefined;
  }

  private parseComment({ item }: { item: Record<string, unknown> }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.COMMENT_KEYS) {
      const value = item[key];

      if (isNumber(value) || isString(value)) {
        return String(value);
      }
    }

    return undefined;
  }

  private parseCurrency({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.CURRENCY_KEYS) {
      const value = item[key];

      if (isString(value)) {
        return value;
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.currency is not valid`
    };
  }

  private parseDataSource({ item }: { item: Record<string, unknown> }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.DATA_SOURCE_KEYS) {
      const value = item[key];

      if (isString(value)) {
        return DataSource[value.toUpperCase() as keyof typeof DataSource];
      }
    }

    return undefined;
  }

  private parseDate({
    content,
    index,
    item,
    type
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
    type: ActivityType;
  }) {
    item = this.lowercaseKeys(item);

    const keys = CASH_FLOW_ACTIVITY_TYPES.includes(type)
      ? ['datetime', ...ImportActivitiesService.DATE_KEYS]
      : ImportActivitiesService.DATE_KEYS;

    for (const key of keys) {
      const value = item[key];

      if (
        CASH_FLOW_ACTIVITY_TYPES.includes(type) &&
        isDate(value) &&
        isFinite(value.getTime())
      ) {
        return value.toISOString();
      }

      if (isNumber(value) || isString(value)) {
        try {
          const parsedDate = parseDateHelper(String(value));

          if (parsedDate) {
            return parsedDate.toISOString();
          }
        } catch {}
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.date is not valid`
    };
  }

  private parseFee({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.FEE_KEYS) {
      const value = item[key];

      if (isNumber(value) && isFinite(value)) {
        return Math.abs(value);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.fee is not valid`
    };
  }

  private parseQuantity({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.QUANTITY_KEYS) {
      const value = item[key];

      if (isNumber(value) && isFinite(value)) {
        return Math.abs(value);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.quantity is not valid`
    };
  }

  private parseSymbol({
    content,
    index,
    item,
    type
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
    type: ActivityType;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.SYMBOL_KEYS) {
      const value = item[key];

      if (isNumber(value) || isString(value)) {
        return String(value);
      }
    }

    if (CASH_FLOW_ACTIVITY_TYPES.includes(type)) {
      for (const key of ['description', 'name']) {
        const value = item[key];

        if (isString(value) && value.trim()) {
          return value.trim();
        }
      }

      return type === ActivityType.DEPOSIT ? 'Deposit' : 'Withdrawal';
    }

    throw {
      activities: content,
      message: `activities.${index}.symbol is not valid`
    };
  }

  private parseType({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }): ActivityType {
    item = this.lowercaseKeys(item);

    const isCashCategory =
      isString(item.category) && item.category.trim().toUpperCase() === 'CASH';
    const cashType =
      isCashCategory &&
      isNumber(item.amount) &&
      isFinite(item.amount) &&
      item.amount !== 0
        ? item.amount > 0
          ? ActivityType.DEPOSIT
          : ActivityType.WITHDRAWAL
        : undefined;

    for (const key of ImportActivitiesService.TYPE_KEYS) {
      const value = item[key];

      if (isString(value)) {
        switch (value.trim().toLowerCase()) {
          case 'buy':
            return 'BUY';
          case 'deposit':
            return 'DEPOSIT';
          case 'dividend':
            return 'DIVIDEND';
          case 'fee':
            if (cashType) {
              break;
            }
            return 'FEE';
          case 'interest':
            if (cashType) {
              break;
            }
            return 'INTEREST';
          case 'liability':
            return 'LIABILITY';
          case 'sell':
            return 'SELL';
          case 'withdraw':
          case 'withdrawal':
            return 'WITHDRAWAL';
          default:
            break;
        }
      }
    }

    if (
      cashType &&
      ImportActivitiesService.TYPE_KEYS.some((key) => {
        const value = item[key];

        return (
          isString(value) &&
          ['FEE', 'INTEREST'].includes(value.trim().toUpperCase())
        );
      })
    ) {
      return cashType;
    }

    for (const key of ImportActivitiesService.TYPE_KEYS) {
      const value = item[key];

      if (isString(value)) {
        const type = value.trim().toUpperCase();

        if (
          (isCashCategory || type.startsWith('TRANSFER_')) &&
          type.endsWith('_INBOUND')
        ) {
          return ActivityType.DEPOSIT;
        }

        if (
          (isCashCategory || type.startsWith('TRANSFER_')) &&
          type.endsWith('_OUTBOUND')
        ) {
          return ActivityType.WITHDRAWAL;
        }
      }
    }

    if (
      cashType &&
      !ImportActivitiesService.TYPE_KEYS.some((key) => {
        const value = item[key];

        return (
          isString(value) &&
          [
            'BALANCE',
            'OPENING_BALANCE',
            'CLOSING_BALANCE',
            'TOTAL',
            'TOTALS',
            'SUMMARY'
          ].includes(value.trim().toUpperCase())
        );
      })
    ) {
      return cashType;
    }

    throw {
      activities: content,
      message: `activities.${index}.type is not valid`
    };
  }

  private parseUnitPrice({
    content,
    index,
    item,
    type
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
    type: ActivityType;
  }) {
    item = this.lowercaseKeys(item);

    const isCashFlow = CASH_FLOW_ACTIVITY_TYPES.includes(type);
    const keys = isCashFlow
      ? ['amount', ...ImportActivitiesService.UNIT_PRICE_KEYS]
      : ImportActivitiesService.UNIT_PRICE_KEYS;

    for (const key of keys) {
      const value = item[key];

      if (isNumber(value) && isFinite(value)) {
        if (isCashFlow && value === 0) {
          break;
        }

        return Math.abs(value);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.unitPrice is not valid`
    };
  }

  private parseUpdateAccountBalance({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }): boolean | undefined {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.UPDATE_ACCOUNT_BALANCE_KEYS) {
      const value = item[key];

      if (typeof value === 'boolean') {
        return value;
      }

      if (
        isString(value) &&
        ['true', 'false'].includes(value.trim().toLowerCase())
      ) {
        return value.trim().toLowerCase() === 'true';
      }

      if (
        value !== undefined &&
        value !== null &&
        (!isString(value) || value.trim())
      ) {
        throw {
          activities: content,
          message: `activities.${index}.updateAccountBalance is not valid`
        };
      }
    }

    return undefined;
  }

  private postImport(
    aImportData: {
      accounts?: CreateAccountWithBalancesDto[];
      activities: CreateOrderDto[];
      assetProfiles?: CreateAssetProfileWithMarketDataDto[];
      platforms?: CreatePlatformDto[];
      tags?: CreateTagDto[];
    },
    aIsDryRun = false
  ) {
    return this.http.post<{ activities: Activity[] }>(
      `/api/v1/import?dryRun=${aIsDryRun}`,
      aImportData
    );
  }
}
