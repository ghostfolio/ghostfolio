import { Filter } from '@ghostfolio/common/interfaces';
import { Scope, scopes } from '@ghostfolio/common/scopes';

import {
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

export class UpdateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsISO8601()
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
