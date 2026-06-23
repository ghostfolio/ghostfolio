import { IsHexColor, IsOptional, IsString } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  name: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}
