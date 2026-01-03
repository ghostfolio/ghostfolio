import { IsOptional, IsString } from 'class-validator';

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  value: string;
}
