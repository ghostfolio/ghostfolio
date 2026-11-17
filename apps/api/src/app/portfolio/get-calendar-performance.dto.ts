import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  Matches,
  ValidateNested
} from 'class-validator';

export class CalendarPerformancePeriodDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;
}

export class GetCalendarPerformanceDto {
  @ArrayMaxSize(55)
  @ArrayMinSize(1)
  @IsArray()
  @Type(() => CalendarPerformancePeriodDto)
  @ValidateNested({ each: true })
  periods: CalendarPerformancePeriodDto[];
}
