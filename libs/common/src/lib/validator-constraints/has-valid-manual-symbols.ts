import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

import { ghostfolioPrefix } from '../config';
import { isValidManualSymbol } from '../helper';

interface ImportDataLike {
  activities?: { dataSource?: string; symbol?: string; type?: string }[];
  assetProfiles?: { dataSource?: string; symbol?: string }[];
}

@ValidatorConstraint({ name: 'hasValidManualSymbols' })
export class HasValidManualSymbolsConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return `manual symbols must be a UUID or start with "${ghostfolioPrefix}_"`;
  }

  public validate(_: unknown, args: ValidationArguments) {
    const { activities = [], assetProfiles = [] } =
      args.object as ImportDataLike;

    const activitiesAreValid = activities.every(
      ({ dataSource, symbol, type }) => {
        // FEE, INTEREST and LIABILITY default to the MANUAL data source
        // (resolved in the backend), so treat them as manual when no data
        // source is set
        const isManual =
          dataSource === 'MANUAL' ||
          (!dataSource && ['FEE', 'INTEREST', 'LIABILITY'].includes(type));

        return !isManual || isValidManualSymbol(symbol);
      }
    );

    const assetProfilesAreValid = assetProfiles.every(
      ({ dataSource, symbol }) => {
        return dataSource !== 'MANUAL' || isValidManualSymbol(symbol);
      }
    );

    return activitiesAreValid && assetProfilesAreValid;
  }
}
