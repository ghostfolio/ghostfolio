import type { Prisma } from '@ghostfolio/prisma/browser';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { HoldingDto } from './holding.dto';

export class UpdateAssetProfileDataDto {
  @IsArray()
  @IsOptional()
  countries?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  @Type(() => HoldingDto)
  @ValidateNested({ each: true })
  holdings?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;
}
