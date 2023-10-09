import { IsString } from 'class-validator';

export class UpdateTagDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}
