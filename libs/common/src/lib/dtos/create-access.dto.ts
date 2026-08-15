import { Filter } from '@ghostfolio/common/interfaces';
import { Scope, scopes } from '@ghostfolio/common/scopes';

import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsIn(Object.values(scopes), { each: true })
  @IsOptional()
  scopes?: Scope[];
}
