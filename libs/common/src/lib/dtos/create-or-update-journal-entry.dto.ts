import { IsISO8601, IsString, MaxLength } from 'class-validator';

export class CreateOrUpdateJournalEntryDto {
  @IsISO8601()
  date: string;

  @IsString()
  @MaxLength(10000)
  note: string;
}
