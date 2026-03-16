import { EntityType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { isString } from 'lodash';

export class CreateEntityDto {
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  name: string;

  @IsEnum(EntityType)
  type: EntityType;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  taxId?: string;
}
