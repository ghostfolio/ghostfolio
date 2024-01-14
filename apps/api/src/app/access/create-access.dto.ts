import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAccessDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @IsOptional()
  @IsString()
  type?: 'PUBLIC';

  @IsOptional()
  @IsString()
  permission?: string;
}
