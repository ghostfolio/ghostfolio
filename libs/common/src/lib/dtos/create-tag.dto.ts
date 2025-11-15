import { IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
