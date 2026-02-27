import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOrUpdateJournalEntryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10000)
  note: string;
}
