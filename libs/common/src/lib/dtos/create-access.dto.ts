import { Filter } from '@ghostfolio/common/interfaces';
import { Scope, scopes } from '@ghostfolio/common/scopes';

import { AccessType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

export class CreateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsArray()
  @IsOptional()
  filters?: Filter[];

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsArray()
  @IsIn(Object.values(scopes), { each: true })
  @IsOptional()
  scopes?: Scope[];

  @IsEnum(AccessType)
  @IsOptional()
  type?: AccessType;
}
