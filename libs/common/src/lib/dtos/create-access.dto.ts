import { Filter } from '@ghostfolio/common/interfaces';

import { AccessPermission } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsEnum(AccessPermission, { each: true })
  @IsOptional()
  permissions?: AccessPermission[];
}
