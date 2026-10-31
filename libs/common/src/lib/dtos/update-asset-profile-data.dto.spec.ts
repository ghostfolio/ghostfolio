import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import 'reflect-metadata';

import { UpdateAssetProfileDataDto } from './update-asset-profile-data.dto';

describe('UpdateAssetProfileDataDto', () => {
  const getInvalidProperties = (assetProfileData: object) => {
    return validateSync(
      plainToInstance(UpdateAssetProfileDataDto, assetProfileData),
      {
        forbidNonWhitelisted: true,
        whitelist: true
      }
    ).map(({ property }) => {
      return property;
    });
  };

  it('Accepts a holding with weight', () => {
    expect(
      getInvalidProperties({ holdings: [{ name: 'Apple', weight: 0.5 }] })
    ).toEqual([]);
  });

  it('Accepts a holding with allocationInPercentage', () => {
    expect(
      getInvalidProperties({
        holdings: [{ allocationInPercentage: 0.5, name: 'Apple' }]
      })
    ).toEqual([]);
  });

  it('Rejects a holding without an allocation', () => {
    expect(getInvalidProperties({ holdings: [{ name: 'Apple' }] })).toEqual([
      'holdings'
    ]);
  });

  it('Rejects a holding which is null', () => {
    expect(getInvalidProperties({ holdings: [null] })).toEqual(['holdings']);
  });
});
