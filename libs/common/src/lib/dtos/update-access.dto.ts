import { AccessPermission } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsString()
  id: string;

  @IsEnum(AccessPermission, { each: true })
  @IsOptional()
  permissions?: AccessPermission[];
}
