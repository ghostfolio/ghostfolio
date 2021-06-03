import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'gf-show-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html'
})
export class ShowAccessTokenDialog {
  public isAgreeButtonDisabled = true;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}

  public enableAgreeButton() {
    setTimeout(() => {
      this.isAgreeButtonDisabled = false;

      this.changeDetectorRef.markForCheck();
    }, 1500);
  }
}
