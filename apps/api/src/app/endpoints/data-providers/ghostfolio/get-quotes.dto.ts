import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class GetQuotesDto {
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value
  )
  symbols: string[];
}
