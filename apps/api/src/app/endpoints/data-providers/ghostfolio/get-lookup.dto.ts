import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class GetLookupDto {
  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => {
    return value === 'true';
  })
  includeIndices? = false;

  @IsString()
  @MaxLength(255)
  query? = '';
}
