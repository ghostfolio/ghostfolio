import { DataSource } from '@prisma/client';

import { applySplitAdjustments } from './portfolio.helper';

describe('applySplitAdjustments', () => {
  const symbolProfile = {
    dataSource: DataSource.YAHOO,
    symbol: 'NVDA'
  };

  const otherSymbolProfile = {
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL'
  };

  const createActivity = ({
    date,
    fee = 1,
    quantity,
    SymbolProfile = symbolProfile,
    unitPrice
  }: {
    date: Date;
    fee?: number;
    quantity: number;
    SymbolProfile?: typeof symbolProfile;
    unitPrice: number;
  }) => {
    return {
      date,
      fee,
      quantity,
      SymbolProfile,
      unitPrice,
      unitPriceInAssetProfileCurrency: unitPrice
    };
  };

  it('should return activities unchanged if there are no splits', () => {
    const activities = [
      createActivity({
        date: new Date('2024-01-15'),
        quantity: 10,
        unitPrice: 400
      })
    ];

    expect(applySplitAdjustments({ activities, splits: [] })).toStrictEqual(
      activities
    );
  });

  it('should adjust an activity before a split', () => {
    const activities = [
      createActivity({
        date: new Date('2024-01-15'),
        quantity: 10,
        unitPrice: 400
      })
    ];

    const [activity] = applySplitAdjustments({
      activities,
      splits: [{ ...symbolProfile, date: new Date('2024-06-10'), factor: 4 }]
    });

    expect(activity.quantity).toBe(40);
    expect(activity.unitPrice).toBe(100);
    expect(activity.unitPriceInAssetProfileCurrency).toBe(100);
  });

  it('should keep the value and the fee unchanged', () => {
    const activities = [
      createActivity({
        date: new Date('2024-01-15'),
        fee: 7,
        quantity: 3,
        unitPrice: 700
      })
    ];

    const [activity] = applySplitAdjustments({
      activities,
      splits: [{ ...symbolProfile, date: new Date('2024-06-10'), factor: 4 }]
    });

    expect(activity.quantity * activity.unitPrice).toBe(3 * 700);
    expect(activity.fee).toBe(7);
  });

  it('should not adjust an activity on or after the split date', () => {
    const activities = [
      createActivity({
        date: new Date('2024-06-10'),
        quantity: 10,
        unitPrice: 100
      }),
      createActivity({
        date: new Date('2024-07-01'),
        quantity: 20,
        unitPrice: 110
      })
    ];

    const adjustedActivities = applySplitAdjustments({
      activities,
      splits: [{ ...symbolProfile, date: new Date('2024-06-10'), factor: 4 }]
    });

    expect(adjustedActivities).toStrictEqual(activities);
  });

  it('should adjust for a reverse split', () => {
    const activities = [
      createActivity({
        date: new Date('2024-01-15'),
        quantity: 100,
        unitPrice: 2
      })
    ];

    const [activity] = applySplitAdjustments({
      activities,
      splits: [{ ...symbolProfile, date: new Date('2024-06-10'), factor: 0.1 }]
    });

    expect(activity.quantity).toBe(10);
    expect(activity.unitPrice).toBe(20);
  });

  it('should compound multiple splits', () => {
    const activities = [
      createActivity({
        date: new Date('2023-01-15'),
        quantity: 10,
        unitPrice: 600
      }),
      createActivity({
        date: new Date('2024-01-15'),
        quantity: 10,
        unitPrice: 300
      })
    ];

    const adjustedActivities = applySplitAdjustments({
      activities,
      splits: [
        { ...symbolProfile, date: new Date('2023-06-10'), factor: 2 },
        { ...symbolProfile, date: new Date('2024-06-10'), factor: 3 }
      ]
    });

    expect(adjustedActivities[0].quantity).toBe(60);
    expect(adjustedActivities[0].unitPrice).toBe(100);
    expect(adjustedActivities[1].quantity).toBe(30);
    expect(adjustedActivities[1].unitPrice).toBe(100);
  });

  it('should not adjust activities of other symbols', () => {
    const activities = [
      createActivity({
        date: new Date('2024-01-15'),
        quantity: 10,
        SymbolProfile: otherSymbolProfile,
        unitPrice: 190
      })
    ];

    const adjustedActivities = applySplitAdjustments({
      activities,
      splits: [{ ...symbolProfile, date: new Date('2024-06-10'), factor: 4 }]
    });

    expect(adjustedActivities).toStrictEqual(activities);
  });
});
