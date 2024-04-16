import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested
} from 'class-validator';

export class Id_UserId {
  @IsString()
  id: string;
}

export class Connect {
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => Id_UserId)
  id_userId: Id_UserId;
}

export class Account {
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => Connect)
  connect: Connect;
}

export class CreateAccountBalanceDto {
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => Account)
  Account: Account;

  @IsNumber()
  balance: number;

  @IsISO8601()
  date: string;
}
