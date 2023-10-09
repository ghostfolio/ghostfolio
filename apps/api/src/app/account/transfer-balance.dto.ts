import { IsNumber, IsString } from 'class-validator';

export class TransferBalanceDto {
  @IsString()
  accountIdFrom: string;

  @IsString()
  accountIdTo: string;

  @IsNumber()
  balance: number;
}
