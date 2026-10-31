import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { HoldingDto } from './holding.dto';

describe('HoldingDto', () => {
  const getInvalidProperties = (holding: object) => {
    return validateSync(plainToInstance(HoldingDto, holding), {
      forbidNonWhitelisted: true,
      whitelist: true
    }).map(({ property }) => {
      return property;
    });
  };

  it('Accepts the allocation as weight', () => {
    expect(getInvalidProperties({ name: 'Apple', weight: 0.5 })).toEqual([]);
  });

  it('Accepts the allocation as allocationInPercentage', () => {
    expect(
      getInvalidProperties({ allocationInPercentage: 0.5, name: 'Apple' })
    ).toEqual([]);
  });

  it('Rejects a holding without an allocation', () => {
    expect(getInvalidProperties({ name: 'Apple' })).toEqual([
      'allocationInPercentage',
      'weight'
    ]);
  });

  it('Rejects an allocation out of range', () => {
    expect(getInvalidProperties({ name: 'Apple', weight: 1.5 })).toEqual([
      'weight'
    ]);
    expect(
      getInvalidProperties({ allocationInPercentage: -0.5, name: 'Apple' })
    ).toEqual(['allocationInPercentage']);
  });

  it('Rejects an invalid allocation next to a valid one', () => {
    expect(
      getInvalidProperties({
        allocationInPercentage: 1.5,
        name: 'Apple',
        weight: 0.5
      })
    ).toEqual(['allocationInPercentage']);
  });

  it('Rejects an unknown property', () => {
    expect(
      getInvalidProperties({ name: 'Apple', value: 100, weight: 0.5 })
    ).toEqual(['value']);
  });
});
