import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetAllAccountsDto extends FilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  query?: string;
}
