import { IsNumber, IsPositive, IsString } from 'class-validator';

export class TransferBalanceDto {
  @IsString()
  accountIdFrom: string;

  @IsString()
  accountIdTo: string;

  @IsNumber()
  @IsPositive()
  balance: number;
}
