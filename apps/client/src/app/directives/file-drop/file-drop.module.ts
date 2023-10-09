import { NgModule } from '@angular/core';

import { FileDropDirective } from './file-drop.directive';

@NgModule({
  declarations: [FileDropDirective],
  exports: [FileDropDirective]
})
export class GfFileDropModule {}
