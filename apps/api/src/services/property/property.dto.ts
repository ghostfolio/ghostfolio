import { IsString } from 'class-validator';

export class PropertyDto {
  @IsString()
  value: string;
}
