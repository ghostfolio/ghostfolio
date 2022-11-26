import { IsObject, IsOptional } from 'class-validator';

export class UpdateAssetProfileDto {
  @IsObject()
  @IsOptional()
  symbolMapping?: object;
}
