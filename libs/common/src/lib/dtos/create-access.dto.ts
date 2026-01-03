import { AccessFilter } from '@ghostfolio/common/interfaces';

import { AccessPermission } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

export class CreateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsObject()
  filter?: AccessFilter;

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsEnum(AccessPermission, { each: true })
  @IsOptional()
  permissions?: AccessPermission[];
}
