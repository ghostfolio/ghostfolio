import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  selector: 'gf-show-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html'
})
export class ShowAccessTokenDialog {
  public isAgreeButtonDisabled = true;

  public constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {}

  public enableAgreeButton() {
    this.isAgreeButtonDisabled = false;
  }
}
