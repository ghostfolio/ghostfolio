import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

import { ImportDataDto } from './import-data.dto';

class RestoreBackupDto extends ImportDataDto {
  @IsObject()
  @IsOptional()
  meta?: object;

  @IsObject()
  @IsOptional()
  user?: {
    settings?: { currency?: string; performanceCalculationType?: string };
  };
}
class RestoreAccountChoiceDto {
  @IsString()
  sourceId: string;
  @IsString()
  targetId: string;
}
export class PortfolioRestoreDto {
  @Type(() => RestoreBackupDto)
  @ValidateNested()
  @IsObject()
  backup: RestoreBackupDto;

  @IsArray()
  @Type(() => RestoreAccountChoiceDto)
  @ValidateNested({ each: true })
  choices: RestoreAccountChoiceDto[];

  @IsOptional()
  @IsBoolean()
  restoreSettings?: boolean;

  @IsOptional()
  @IsString()
  digest?: string;
}
