import { UpdateUserSettingDto } from '@ghostfolio/common/dtos/update-user-setting.dto';

import { validate } from 'class-validator';

import { createDefaultPortfolioTarget } from './portfolio-targets-presets';

function makeDto() {
  return Object.assign(new UpdateUserSettingDto(), {
    portfolioTargets: {
      version: 1 as const,
      activeProfileId: 'global',
      profiles: [createDefaultPortfolioTarget()]
    }
  });
}

describe('Portfolio targets HTTP validation', () => {
  it('accepts the versioned target and existing users without one', async () => {
    expect(await validate(makeDto())).toEqual([]);
    expect(await validate(new UpdateUserSettingDto())).toEqual([]);
  });

  it.each([-0.01, 1.01, NaN, Infinity])(
    'rejects tolerance %s',
    async (tolerance) => {
      const dto = makeDto();
      dto.portfolioTargets.profiles[0].tolerance = tolerance;
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'portfolioTargets' })
        ])
      );
    }
  );

  it('rejects null instead of storing an unversioned target', async () => {
    const dto = Object.assign(makeDto(), { portfolioTargets: null });
    expect(await validate(dto)).toHaveLength(1);
  });

  it('rejects incomplete allocations and unsupported versions', async () => {
    const dto = makeDto();
    delete dto.portfolioTargets.profiles[0].allocations.COMMODITY;
    expect(await validate(dto)).toHaveLength(1);
    const unsupported = Object.assign(makeDto(), {
      portfolioTargets: { ...makeDto().portfolioTargets, version: 2 }
    });
    expect(await validate(unsupported)).toHaveLength(1);
  });
});
