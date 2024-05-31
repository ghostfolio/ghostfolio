import { Module } from '@nestjs/common';

import { UserHelperService } from './user-helper.service';

@Module({
  exports: [UserHelperService],
  providers: [UserHelperService]
})
export class UserHelperModule {}
