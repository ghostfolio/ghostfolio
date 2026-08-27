import { Filter } from '@ghostfolio/common/interfaces';
import { Scope, scopes } from '@ghostfolio/common/scopes';
import { IsInTheFutureConstraint } from '@ghostfolio/common/validator-constraints/is-in-the-future';

import { AccessType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Validate
} from 'class-validator';

export class CreateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsISO8601()
  @Validate(IsInTheFutureConstraint)
  expiresAt: string;

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
