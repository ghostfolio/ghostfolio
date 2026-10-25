import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsNumber,
  IsPositive,
  IsString
} from 'class-validator';

export class TransferBalanceDto {
  @IsString()
  accountIdFrom: string;

  @IsString()
  accountIdTo: string;

  @IsNumber()
  @IsPositive()
  balance: number;

  @IsBoolean()
  @IsOptional()
  confirmNegativeBalance?: boolean;

  @IsObject()
  @IsOptional()
  cashRevisions?: Record<string, number>;
}
