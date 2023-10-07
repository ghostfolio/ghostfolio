import {
    IsNumber,
    IsString,
} from 'class-validator';

export class TransferCashBalanceDto {
    @IsString()
    accountIdFrom: string;

    @IsString()
    accountIdTo: string;

    @IsNumber()
    balance: number;
}
