import { CreateOrderDto } from '@ghostfolio/common/dtos';
import { Activity } from '@ghostfolio/common/interfaces';
import type { Account } from '@ghostfolio/prisma/browser';

import {
  convertTradeRepublicCsv,
  isTradeRepublicCsv,
  reconcileTradeRepublicActivities
} from './trade-republic';

const CSV = `"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","original_amount","original_currency","fx_rate","description","transaction_id","counterparty_name","counterparty_iban","payment_reference","mcc_code"
"2021-01-26T09:37:12.971Z","2021-01-26","DEFAULT","TRADING","BUY","STOCK","Apple","US0378331005","125.0000000000","1.345000","-168.13","-1.00","","EUR","","","","","a1","","","",""
"2021-01-27T22:49:34.578Z","2021-01-27","DEFAULT","TRADING","SELL","STOCK","Apple","US0378331005","-2.0000000000","248.200000","496.40","-1.00","","EUR","","","","","a2","","","",""
"2024-02-01T13:26:26.799818Z","2024-02-01","DEFAULT","CASH","DIVIDEND","STOCK","Apple","US0378331005","25.0000000000","","6.410000","","-0.96","EUR","5.92","USD","1.083000","","a3","","","",""
"2026-04-02T07:18:13.532Z","2026-04-02","DEFAULT","TRADING","BUY","FUND","MSCI World","IE00B4L5Y983","71.3165020000","7.0110000000","-500.00","","","EUR","","","","","a4","","","",""
"2024-04-02T14:29:55.555110Z","2024-04-02","DEFAULT","CASH","BENEFITS_SAVEBACK","FUND","MSCI World","IE00B4L5Y983","","","0.370000","","","EUR","","","","","a5","","","",""
"2024-04-03T10:00:00.000Z","2024-04-03","DEFAULT","CASH","CARD_TRANSACTION","","","","","","-12.00","","","EUR","","","","","a6","Shop","","",""`;

describe('TradeRepublic', () => {
  const activity = (
    date: Date | string,
    type: Activity['type'],
    quantity: number,
    unitPrice: number,
    symbol = 'GF_US0378331005',
    comment?: string
  ) => {
    return {
      comment,
      date,
      quantity,
      type,
      unitPrice,
      assetProfile: { symbol }
    } as unknown as Activity;
  };

  it('detects the export', () => {
    expect(isTradeRepublicCsv(CSV)).toBe(true);
    expect(isTradeRepublicCsv('Date,Code,Action\n2021-01-26,GF_X,Buy')).toBe(
      false
    );
  });

  it('converts trades and dividends', () => {
    const { activities, assetProfiles } = convertTradeRepublicCsv({
      fileContent: CSV,
      userAccounts: [{ id: 'tr', name: 'Trade Republic' } as Account]
    });

    expect(activities).toMatchObject([
      {
        accountId: 'tr',
        fee: 1,
        quantity: 125,
        symbol: 'GF_US0378331005',
        type: 'BUY',
        unitPrice: 1.345
      },
      { fee: 1, quantity: 2, type: 'SELL', unitPrice: 248.2 },
      { fee: 0, quantity: 25, type: 'DIVIDEND', unitPrice: 6.41 / 25 },
      { symbol: 'GF_IE00B4L5Y983', type: 'BUY', unitPrice: 7.011 }
    ]);

    expect(assetProfiles).toMatchObject([
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        dataSource: 'MANUAL',
        isin: 'US0378331005',
        name: 'Apple',
        symbol: 'GF_US0378331005'
      },
      { assetSubClass: 'ETF', symbol: 'GF_IE00B4L5Y983' }
    ]);
  });

  it('marks activities of earlier imports as duplicates', () => {
    const activities = [
      activity('2021-01-26T09:37:12.971Z', 'BUY', 125, 1.345),
      activity('2024-02-01T13:26:26.799Z', 'DIVIDEND', 25, 6.41 / 25),
      activity('2024-03-01T13:26:26.799Z', 'DIVIDEND', 25, 6.5 / 25),
      activity('2026-04-02T07:18:13.532Z', 'BUY', 71.316502, 7.011),
      activity('2026-04-02T15:18:13.532Z', 'BUY', 71.316502, 7.02),
      activity('2026-05-04T07:18:13.532Z', 'BUY', 71.316502, 7.011),
      activity('2026-06-02T07:18:13.532Z', 'BUY', 10, 7.011),
      activity('2026-07-02T07:18:13.532Z', 'BUY', 3, 7, 'uuid', 't1')
    ];

    const existingActivities = [
      activity(new Date(2021, 0, 26), 'BUY', 125, 1.35),
      activity(new Date(2024, 1, 1), 'DIVIDEND', 25, 6.41),
      activity(new Date(2024, 2, 1), 'DIVIDEND', 25, 0.26),
      activity('2026-04-02T07:18:13.532Z', 'BUY', 71.316502, 7.011),
      activity(new Date(2026, 4, 5), 'BUY', 71.316502, 7.011),
      activity('2026-06-02T07:18:13.532Z', 'BUY', 10, 7.011, 'GF_OTHER'),
      activity('2026-07-02T07:18:13.532Z', 'BUY', 3, 7, 'GF_X')
    ];

    expect(
      reconcileTradeRepublicActivities({
        activities,
        existingActivities,
        convertedActivities: [
          { comment: 't1', symbol: 'GF_X' } as CreateOrderDto
        ]
      }).map(({ error }) => {
        return error?.code;
      })
    ).toEqual([
      'IS_DUPLICATE',
      'IS_DUPLICATE',
      'IS_DUPLICATE',
      'IS_DUPLICATE',
      undefined,
      undefined,
      undefined,
      'IS_DUPLICATE'
    ]);
  });

  it('skips activities of untracked instruments before the latest duplicate', () => {
    const activities = [
      activity('2025-01-02T10:00:00.000Z', 'BUY', 1, 10, 'GF_OLD'),
      activity('2026-08-30T10:00:00.000Z', 'BUY', 2, 10),
      activity('2026-09-02T10:00:00.000Z', 'BUY', 1, 10, 'GF_NEW')
    ];

    const existingActivities = [
      activity('2026-08-30T10:00:00.000Z', 'BUY', 2, 10),
      activity('2026-09-10T10:00:00.000Z', 'BUY', 5, 10)
    ];

    expect(
      reconcileTradeRepublicActivities({
        activities,
        existingActivities,
        convertedActivities: []
      }).map(({ assetProfile }) => {
        return assetProfile.symbol;
      })
    ).toEqual(['GF_US0378331005', 'GF_NEW']);

    expect(
      reconcileTradeRepublicActivities({
        activities,
        convertedActivities: [],
        existingActivities: []
      })
    ).toHaveLength(3);
  });
});
