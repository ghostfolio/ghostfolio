import { Filter } from '@ghostfolio/common/interfaces';

import { AccessPermission, AccessType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

export class CreateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;

  @IsArray()
  @IsOptional()
  filters?: Filter[];

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsEnum(AccessPermission, { each: true })
  @IsOptional()
  permissions?: AccessPermission[];

  @IsEnum(AccessType)
  @IsOptional()
  type?: AccessType;
}
