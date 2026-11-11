import { validateSync } from 'class-validator';

import { UpdateUserSettingDto } from './update-user-setting.dto';

describe('UpdateUserSettingDto benchmark comparison mode', () => {
  function validateMode(value?: unknown) {
    const dto = new UpdateUserSettingDto();

    if (value !== undefined) {
      Object.assign(dto, { benchmarkComparisonMode: value });
    }

    return validateSync(dto).filter(({ property }) => {
      return property === 'benchmarkComparisonMode';
    });
  }

  it.each(['TRADITIONAL', 'ACTIVITY_MATCHED_ROI', 'ACTIVITY_MATCHED_ROAI'])(
    'accepts %s',
    (mode) => {
      expect(validateMode(mode)).toEqual([]);
    }
  );

  it('accepts an omitted mode for backward compatibility', () => {
    expect(validateMode()).toEqual([]);
  });

  it.each(['ROI', 'ROAI', 'MWR', 'INVALID', '', 123, true, [], {}])(
    'rejects invalid mode %p',
    (mode) => {
      expect(validateMode(mode)).toHaveLength(1);
    }
  );

  it('currently accepts null through IsOptional', () => {
    expect(validateMode(null)).toEqual([]);
  });
});
