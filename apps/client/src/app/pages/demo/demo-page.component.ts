import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  host: { class: 'page' },
  selector: 'gf-demo-page',
  templateUrl: './demo-page.html'
})
export class DemoPageComponent implements OnDestroy {
  public info: InfoItem;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private tokenStorageService: TokenStorageService,
    public dialog: MatDialog
  ) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    const hasToken = this.tokenStorageService.getToken()?.length > 0;
    if (hasToken) {
      this.dialog.open(DialogAnimationsExampleDialog, {
        width: '50%'
      });
    } else {
      this.tokenStorageService.saveToken(this.info.demoAuthToken, true);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
@Component({
  selector: 'demo-page-dialog',
  templateUrl: './demo-page-dialog.html'
})
export class DialogAnimationsExampleDialog {
  public text: String;

  constructor(
    public dialogRef: MatDialogRef<DialogAnimationsExampleDialog>,
    private router: Router
  ) {
    this.text = $localize`As you are already logged in, you cannot access the demo account.`;
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}
