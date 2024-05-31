import { UserHelperModule } from '@ghostfolio/api/services/user-helper/user-helper.module';
import { UserHelperService } from '@ghostfolio/api/services/user-helper/user-helper.service';

import { Module } from '@nestjs/common';

@Module({
  exports: [UserHelperService],
  imports: [UserHelperModule],
  providers: [UserHelperService]
})
export class RedactValuesInResponseModule {}
