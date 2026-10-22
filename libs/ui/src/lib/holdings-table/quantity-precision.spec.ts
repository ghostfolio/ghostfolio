import { AssetSubClass } from '@ghostfolio/prisma/enums';

import { HoldingsTableItem } from './interfaces/interfaces';
import { getHoldingQuantityPrecision } from './quantity-precision';

function createHolding(
  quantity: number | undefined,
  assetSubClass: AssetSubClass
): Pick<HoldingsTableItem, 'assetProfile' | 'quantity'> {
  return {
    assetProfile: { assetSubClass } as HoldingsTableItem['assetProfile'],
    quantity
  };
}

describe('getHoldingQuantityPrecision', () => {
  it('preserves satoshi precision for fractional cryptocurrency quantities', () => {
    expect(
      getHoldingQuantityPrecision(
        createHolding(0.01525217, AssetSubClass.CRYPTOCURRENCY)
      )
    ).toBe(8);
    expect(
      getHoldingQuantityPrecision(
        createHolding(10.12345678, AssetSubClass.CRYPTOCURRENCY)
      )
    ).toBe(8);
  });

  it('does not add decimal places to integer cryptocurrency quantities', () => {
    expect(
      getHoldingQuantityPrecision(
        createHolding(12, AssetSubClass.CRYPTOCURRENCY)
      )
    ).toBe(0);
  });

  it('keeps the existing precision for non-cryptocurrency quantities', () => {
    expect(
      getHoldingQuantityPrecision(createHolding(12.3456, AssetSubClass.STOCK))
    ).toBe(2);
  });

  it('does not add decimal places when the quantity is not available', () => {
    expect(
      getHoldingQuantityPrecision(
        createHolding(undefined, AssetSubClass.CRYPTOCURRENCY)
      )
    ).toBe(0);
  });
});
