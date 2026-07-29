import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

import { ghostfolioPrefix } from '../config';
import { isValidCustomAssetProfileSymbol } from '../helper';

@ValidatorConstraint({ name: 'isCustomAssetProfileSymbol' })
export class IsCustomAssetProfileSymbolConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return `$property must be a UUID or start with the prefix "${ghostfolioPrefix}_"`;
  }

  public validate(aSymbol: string) {
    return isValidCustomAssetProfileSymbol(aSymbol);
  }
}
