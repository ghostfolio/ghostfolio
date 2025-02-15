import { IsOptional, IsString } from 'class-validator';

export class UpdateTagDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
