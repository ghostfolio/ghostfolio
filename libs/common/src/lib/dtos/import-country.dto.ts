import { IsOptional, IsString } from 'class-validator';

import { CountryDto } from './country.dto';

export class ImportCountryDto extends CountryDto {
  /** Part of the export, not used because it is derived from the code */
  @IsOptional()
  @IsString()
  continent?: string;

  /** Part of the export, not used because it is derived from the code */
  @IsOptional()
  @IsString()
  name?: string;
}
