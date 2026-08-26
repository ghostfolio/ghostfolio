import { Filter } from '@ghostfolio/common/interfaces';
import { Scope, scopes } from '@ghostfolio/common/scopes';
import { IsInTheFutureConstraint } from '@ghostfolio/common/validator-constraints/is-in-the-future';

import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Validate
} from 'class-validator';

export class UpdateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsDateString()
  @Validate(IsInTheFutureConstraint)
  expiresAt: string;

  @IsArray()
  @IsOptional()
  filters?: Filter[];

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsString()
  id: string;

  @IsArray()
  @IsIn(Object.values(scopes), { each: true })
  @IsOptional()
  scopes?: Scope[];
}
