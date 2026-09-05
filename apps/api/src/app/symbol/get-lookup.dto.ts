import { SEARCH_QUERY_MAXIMUM_LENGTH } from '@ghostfolio/common/config';

import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class GetLookupDto {
  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => {
    return value === 'true';
  })
  includeIndices? = false;

  @IsString()
  @MaxLength(SEARCH_QUERY_MAXIMUM_LENGTH)
  query? = '';
}
