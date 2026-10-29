import { ghostfolioPrefix } from '@ghostfolio/common/config';
import {
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto
} from '@ghostfolio/common/dtos';
import { Activity } from '@ghostfolio/common/interfaces';
import type { Account } from '@ghostfolio/prisma/browser';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Type as ActivityType
} from '@ghostfolio/prisma/enums';

import { format } from 'date-fns';
import { isDate, isFinite, isNumber, isString } from 'lodash-es';
import { parse as csvToJson } from 'papaparse';

const ACCOUNT_NAME = 'Trade Republic';

const ACTIVITY_TYPES: Record<string, ActivityType> = {
  BUY: 'BUY',
  DISTRIBUTION: 'DIVIDEND',
  DIVIDEND: 'DIVIDEND',
  SELL: 'SELL'
};

const ASSET_CLASSES: Record<
  string,
  { assetClass: AssetClass; assetSubClass: AssetSubClass }
> = {
  BOND: {
    assetClass: AssetClass.FIXED_INCOME,
    assetSubClass: AssetSubClass.BOND
  },
  FUND: { assetClass: AssetClass.EQUITY, assetSubClass: AssetSubClass.ETF },
  STOCK: { assetClass: AssetClass.EQUITY, assetSubClass: AssetSubClass.STOCK }
};

const REQUIRED_FIELDS = [
  'account_type',
  'amount',
  'asset_class',
  'datetime',
  'shares',
  'symbol',
  'transaction_id',
  'type'
];

export function isTradeRepublicCsv(fileContent: string) {
  const { fields = [] } = csvToJson(fileContent, {
    header: true,
    preview: 1
  }).meta;

  return REQUIRED_FIELDS.every((field) => {
    return fields.includes(field);
  });
}

/**
 * Converts a Trade Republic transaction export into activities and custom
 * asset profiles. Rows other than trades and dividends are skipped.
 */
export function convertTradeRepublicCsv({
  fileContent,
  userAccounts
}: {
  fileContent: string;
  userAccounts: Account[];
}) {
  const rows = csvToJson<Record<string, unknown>>(fileContent, {
    dynamicTyping: true,
    header: true,
    skipEmptyLines: true
  }).data;

  const accountId = userAccounts.find(({ name }) => {
    return name?.toLowerCase() === ACCOUNT_NAME.toLowerCase();
  })?.id;

  const activities: CreateOrderDto[] = [];
  const assetProfiles = new Map<string, CreateAssetProfileWithMarketDataDto>();

  for (const row of rows) {
    const type = ACTIVITY_TYPES[toString(row.type)];
    const isin = toString(row.symbol);
    const quantity = Math.abs(toNumber(row.shares));

    if (!type || !isin || !quantity) {
      continue;
    }

    const currency = toString(row.currency) || 'EUR';
    const symbol = `${ghostfolioPrefix}_${isin}`;

    // Dividend rows only contain the total amount
    const unitPrice =
      type === 'DIVIDEND' || !toNumber(row.price)
        ? Math.abs(toNumber(row.amount)) / quantity
        : toNumber(row.price);

    activities.push({
      accountId,
      currency,
      quantity,
      symbol,
      type,
      unitPrice,
      comment: toString(row.transaction_id),
      dataSource: DataSource.MANUAL,
      date: toDate(row.datetime).toISOString(),
      fee: Math.abs(toNumber(row.fee)),
      updateAccountBalance: false
    });

    if (!assetProfiles.has(symbol)) {
      assetProfiles.set(symbol, {
        currency,
        isin,
        symbol,
        assetClass: ASSET_CLASSES[toString(row.asset_class)]?.assetClass,
        assetSubClass: ASSET_CLASSES[toString(row.asset_class)]?.assetSubClass,
        countries: [],
        dataSource: DataSource.MANUAL,
        holdings: [],
        isActive: true,
        marketData: [],
        name: toString(row.name) || isin,
        sectors: []
      });
    }
  }

  return { activities, assetProfiles: [...assetProfiles.values()] };
}

/**
 * Marks activities as duplicates if they match an existing activity, including
 * those imported with day-only dates, rounded prices and dividends with the
 * total amount as unit price. Activities of instruments without existing
 * activities are skipped if they predate the latest existing activity of the
 * export.
 */
export function reconcileTradeRepublicActivities({
  activities,
  existingActivities
}: {
  activities: Activity[];
  existingActivities: Activity[];
}): Activity[] {
  const symbols = new Set(
    activities.map(({ assetProfile }) => {
      return assetProfile?.symbol;
    })
  );

  const relatedActivities = existingActivities.filter(({ assetProfile }) => {
    return symbols.has(assetProfile?.symbol);
  });

  const trackedSymbols = new Set(
    relatedActivities.map(({ assetProfile }) => {
      return assetProfile?.symbol;
    })
  );

  const latestDate = Math.max(
    ...relatedActivities.map(({ date }) => {
      return toDate(date).getTime();
    })
  );

  return activities
    .filter(({ assetProfile, date }) => {
      return (
        trackedSymbols.has(assetProfile?.symbol) ||
        toDate(date).getTime() > latestDate
      );
    })
    .map((activity) => {
      const isDuplicate = existingActivities.some((existingActivity) => {
        return isSameTradeRepublicActivity(existingActivity, activity);
      });

      return isDuplicate
        ? { ...activity, error: { code: 'IS_DUPLICATE' } }
        : activity;
    });
}

function isSameTradeRepublicActivity(existing: Activity, activity: Activity) {
  if (
    existing.assetProfile?.symbol !== activity.assetProfile?.symbol ||
    existing.type !== activity.type ||
    Math.abs(existing.quantity - activity.quantity) >
      1e-6 * Math.max(1, activity.quantity)
  ) {
    return false;
  }

  const date = toDate(activity.date);
  const existingDate = toDate(existing.date);

  // Day-only dates were stored as midnight in the timezone of the browser
  if (
    Math.abs(existingDate.getTime() - date.getTime()) >= 1000 &&
    format(existingDate, 'yyyy-MM-dd') !== date.toISOString().slice(0, 10)
  ) {
    return false;
  }

  const value = activity.quantity * activity.unitPrice;
  const existingValue = existing.quantity * existing.unitPrice;

  return (
    Math.abs(existingValue - value) <= Math.max(0.01, 0.01 * value) ||
    (activity.type === 'DIVIDEND' &&
      Math.abs(existing.unitPrice - value) < 0.01)
  );
}

function toDate(value: unknown) {
  return isDate(value) ? value : new Date(toString(value));
}

function toNumber(value: unknown) {
  return isNumber(value) && isFinite(value) ? value : 0;
}

function toString(value: unknown) {
  return isString(value) ? value.trim() : '';
}
