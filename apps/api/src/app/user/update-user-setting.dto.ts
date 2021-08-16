import { IsBoolean } from 'class-validator';

export class UpdateUserSettingDto {
  @IsBoolean()
  isRestrictedView?: boolean;
}
