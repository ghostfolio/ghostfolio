import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CountryDto } from './country.dto';

describe('CountryDto', () => {
  const getInvalidProperties = (country: object) => {
    return validateSync(plainToInstance(CountryDto, country), {
      forbidNonWhitelisted: true,
      whitelist: true
    }).map(({ property }) => {
      return property;
    });
  };

  it('Accepts a country with a code and a weight', () => {
    expect(getInvalidProperties({ code: 'US', weight: 1 })).toEqual([]);
  });

  it('Rejects a continent and a name', () => {
    expect(
      getInvalidProperties({
        code: 'US',
        continent: 'North America',
        name: 'United States',
        weight: 1
      })
    ).toEqual(['continent', 'name']);
  });

  it('Rejects an invalid code and a weight out of range', () => {
    expect(getInvalidProperties({ code: 'USA', weight: 1.5 })).toEqual([
      'code',
      'weight'
    ]);
  });

  it('Rejects an unknown property', () => {
    expect(
      getInvalidProperties({ code: 'US', other: 'value', weight: 1 })
    ).toEqual(['other']);
  });
});
