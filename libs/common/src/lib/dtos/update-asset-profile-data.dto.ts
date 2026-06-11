import { PickType } from '@nestjs/mapped-types';

import { UpdateAssetProfileDto } from './update-asset-profile.dto';

export class UpdateAssetProfileDataDto extends PickType(UpdateAssetProfileDto, [
  'countries',
  'holdings',
  'sectors'
]) {}
