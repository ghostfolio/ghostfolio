import {
    IsNumber,
    IsString,
} from 'class-validator';

export class TransferCashBalanceDto {
    @IsString()
    fromAccount: string;

    @IsString()
    toAccount: string;

    @IsNumber()
    balance: number;
}
