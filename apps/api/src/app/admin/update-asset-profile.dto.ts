import { Prisma } from '@prisma/client';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAssetProfileDto {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };
}
