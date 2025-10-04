import { AccessPermission } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAccessDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsEnum(AccessPermission, { each: true })
  @IsOptional()
  permissions?: AccessPermission[];
}
