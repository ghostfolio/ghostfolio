import { IsISO8601, IsNumber, IsUUID } from 'class-validator';

export class CreateAccountBalanceDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  balance: number;

  @IsISO8601()
  date: string;
}
