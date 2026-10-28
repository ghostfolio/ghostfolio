import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';
import { SEARCH_QUERY_MAXIMUM_LENGTH } from '@ghostfolio/common/config';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetAllAccountsDto extends FilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_QUERY_MAXIMUM_LENGTH)
  query?: string;
}
