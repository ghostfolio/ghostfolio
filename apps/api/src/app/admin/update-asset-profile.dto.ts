import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAssetProfileDto {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };
}
