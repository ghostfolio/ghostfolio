import { IsHexColor, IsOptional, IsString } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}
