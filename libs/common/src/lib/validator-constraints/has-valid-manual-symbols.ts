import { DataSource } from '@prisma/client';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

import {
  ACTIVITY_TYPES_WITH_GENERATED_UUID_SYMBOL,
  ghostfolioPrefix
} from '../config';
import { isValidManualSymbol } from '../helper';
import { ImportDataLike } from './interfaces/interfaces';

@ValidatorConstraint({ name: 'hasValidManualSymbols' })
export class HasValidManualSymbolsConstraint implements ValidatorConstraintInterface {
  public defaultMessage(args: ValidationArguments) {
    const entry = this.getEntryWithInvalidManualSymbol(
      args.object as ImportDataLike
    );

    return `manual symbols must be a UUID or start with "${ghostfolioPrefix}_", but got "${entry?.symbol ?? ''}"`;
  }

  public validate(_: unknown, args: ValidationArguments) {
    return !this.getEntryWithInvalidManualSymbol(args.object as ImportDataLike);
  }

  private getEntryWithInvalidManualSymbol({
    activities,
    assetProfiles
  }: ImportDataLike) {
    // Defer to @IsArray() and @ValidateNested() for malformed input
    const activityWithInvalidSymbol = this.toEntries(activities).find(
      ({ dataSource, symbol, type }) => {
        const hasGeneratedUuidSymbol =
          ACTIVITY_TYPES_WITH_GENERATED_UUID_SYMBOL.some((activityType) => {
            return activityType === type;
          });

        return (
          dataSource === DataSource.MANUAL &&
          !hasGeneratedUuidSymbol &&
          !isValidManualSymbol(symbol)
        );
      }
    );

    if (activityWithInvalidSymbol) {
      return activityWithInvalidSymbol;
    }

    return this.toEntries(assetProfiles).find(({ dataSource, symbol }) => {
      return dataSource === DataSource.MANUAL && !isValidManualSymbol(symbol);
    });
  }

  private toEntries<T>(aValue?: T[]) {
    if (!Array.isArray(aValue)) {
      return [];
    }

    return aValue.filter((entry) => {
      return entry instanceof Object;
    });
  }
}
