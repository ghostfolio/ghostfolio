import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';
import { HasValidManualSymbolsConstraint } from '@ghostfolio/common/validator-constraints/has-valid-manual-symbols';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, Validate, ValidateNested } from 'class-validator';

export class ImportDataDto {
  @IsArray()
  @IsOptional()
  @Type(() => CreateAccountWithBalancesDto)
  @ValidateNested({ each: true })
  accounts?: CreateAccountWithBalancesDto[];

  @IsArray()
  @Type(() => CreateOrderDto)
  @Validate(HasValidManualSymbolsConstraint)
  @ValidateNested({ each: true })
  activities: CreateOrderDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateAssetProfileWithMarketDataDto)
  @ValidateNested({ each: true })
  assetProfiles?: CreateAssetProfileWithMarketDataDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateTagDto)
  @ValidateNested({ each: true })
  tags?: CreateTagDto[];
}
