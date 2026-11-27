import { getCountryCodeByName } from '@ghostfolio/api/helper/country.helper';
import { getSectorName } from '@ghostfolio/api/helper/sector.helper';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { SectorName } from '@ghostfolio/common/types';

import { Big } from 'big.js';
import { countries as isoCountries } from 'countries-list';

export interface EtfExposure {
  name: string;
  weight: number;
}

export interface EtfComposition {
  countries?: EtfExposure[];
  sectors?: EtfExposure[];
}

export interface NormalizedEtfComposition {
  countries: Pick<Country, 'code' | 'weight'>[];
  sectors: Sector[];
  countryCoverage: number;
  sectorCoverage: number;
  classifiedSectorCoverage: number;
  unclassifiedCountryWeight: number;
  missingCountryWeight: number;
}

export const ETF_WEIGHT_TOLERANCE = 0.00001;

const COUNTRY_ALIASES: Record<string, string> = {
  'Czech Republic': 'CZ',
  'Korea, Republic of': 'KR',
  'Russian Federation': 'RU',
  'South Korea': 'KR',
  Taiwan: 'TW',
  Turkey: 'TR',
  'United Kingdom': 'GB',
  'United States': 'US'
};

const SECTOR_ALIASES: Record<string, SectorName> = {
  'Business Services': 'Industrials',
  Communication: 'Communication Services',
  'Consumer Discretionary': 'Consumer Cyclical',
  'Consumer Staples': 'Consumer Defensive',
  Financials: 'Financial Services',
  'Health Care': 'Healthcare',
  'Information Technology': 'Technology',
  Materials: 'Basic Materials'
};

function validateExposure({ name, weight }: EtfExposure): void {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Invalid ETF exposure name');
  }

  if (
    typeof weight !== 'number' ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 1 + ETF_WEIGHT_TOLERANCE
  ) {
    throw new Error(`Invalid ETF exposure weight: ${weight}`);
  }
}

function validateTotal(weight: Big, label: string): void {
  if (weight.gt(new Big(1).plus(ETF_WEIGHT_TOLERANCE))) {
    throw new Error(`ETF ${label} weights exceed 100%`);
  }
}

export function normalizeEtfComposition({
  countries,
  sectors
}: EtfComposition): NormalizedEtfComposition {
  if (countries !== undefined && !Array.isArray(countries)) {
    throw new Error('Invalid ETF country exposures');
  }

  if (sectors !== undefined && !Array.isArray(sectors)) {
    throw new Error('Invalid ETF sector exposures');
  }

  const countryWeights = new Map<string, Big>();
  const sectorWeights = new Map<string, Big>();

  let unclassifiedCountryWeight = new Big(0);

  for (const exposure of countries ?? []) {
    if (!exposure || typeof exposure !== 'object') {
      throw new Error('Invalid ETF country exposure');
    }

    validateExposure(exposure);

    const { name, weight } = exposure;

    const code = Object.prototype.hasOwnProperty.call(isoCountries, name)
      ? name
      : getCountryCodeByName({
          aliases: COUNTRY_ALIASES,
          name: name.trim()
        });

    if (!code) {
      unclassifiedCountryWeight = unclassifiedCountryWeight.plus(weight);
      continue;
    }

    countryWeights.set(
      code,
      (countryWeights.get(code) ?? new Big(0)).plus(weight)
    );
  }

  for (const exposure of sectors ?? []) {
    if (!exposure || typeof exposure !== 'object') {
      throw new Error('Invalid ETF sector exposure');
    }

    validateExposure(exposure);

    const { name, weight } = exposure;

    const sector = getSectorName({
      aliases: SECTOR_ALIASES,
      name: name.trim()
    });

    sectorWeights.set(
      sector,
      (sectorWeights.get(sector) ?? new Big(0)).plus(weight)
    );
  }

  const countryCoverage = [...countryWeights.values()].reduce(
    (sum, weight) => sum.plus(weight),
    new Big(0)
  );

  const sectorCoverage = [...sectorWeights.values()].reduce(
    (sum, weight) => sum.plus(weight),
    new Big(0)
  );

  const classifiedSectorCoverage = [...sectorWeights.entries()].reduce(
    (sum, [name, weight]) => (name === 'Other' ? sum : sum.plus(weight)),
    new Big(0)
  );

  const totalCountryWeight = countryCoverage.plus(unclassifiedCountryWeight);

  validateTotal(totalCountryWeight, 'country');
  validateTotal(sectorCoverage, 'sector');

  const missingCountryWeight = new Big(1).minus(totalCountryWeight);

  return {
    countries: [...countryWeights.entries()].map(([code, weight]) => ({
      code,
      weight: weight.toNumber()
    })),
    sectors: [...sectorWeights.entries()].map(([name, weight]) => ({
      name,
      weight: weight.toNumber()
    })),
    countryCoverage: countryCoverage.toNumber(),
    sectorCoverage: sectorCoverage.toNumber(),
    classifiedSectorCoverage: classifiedSectorCoverage.toNumber(),
    unclassifiedCountryWeight: unclassifiedCountryWeight.toNumber(),
    missingCountryWeight: missingCountryWeight.lt(0)
      ? 0
      : missingCountryWeight.toNumber()
  };
}
