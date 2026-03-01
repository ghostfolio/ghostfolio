import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEthereumAddress,
  IsISO8601,
  IsOptional
} from 'class-validator';

export class HyperliquidImportDto {
  @IsEthereumAddress()
  walletAddress: string;

  @IsISO8601()
  @IsOptional()
  from?: string;

  @IsISO8601()
  @IsOptional()
  to?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeLedger?: boolean;
}
