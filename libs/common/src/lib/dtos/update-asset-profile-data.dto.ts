import type { Prisma } from '@ghostfolio/prisma/browser';

import { IsArray, IsOptional } from 'class-validator';

export class UpdateAssetProfileDataDto {
  @IsArray()
  @IsOptional()
  countries?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  holdings?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;
}
