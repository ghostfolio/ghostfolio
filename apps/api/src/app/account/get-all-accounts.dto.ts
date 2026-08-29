import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';

import { IsOptional, IsString } from 'class-validator';

export class GetAllAccountsDto extends FilterDto {
  @IsOptional()
  @IsString()
  query?: string;
}
