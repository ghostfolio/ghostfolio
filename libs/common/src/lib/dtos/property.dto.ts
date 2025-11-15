import { IsOptional, IsString } from 'class-validator';

export class PropertyDto {
  @IsOptional()
  @IsString()
  value: string;
}
