import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { Access, User } from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { NotificationService } from '@ghostfolio/ui/notifications';

import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  copyOutline,
  createOutline,
  ellipsisHorizontal,
  linkOutline,
  lockClosedOutline,
  lockOpenOutline,
  removeCircleOutline
} from 'ionicons/icons';
import ms from 'ms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-access-table',
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss']
})
export class GfAccessTableComponent implements OnChanges {
  @Input() accesses: Access[];
  @Input() showActions: boolean;
  @Input() user: User;

  @Output() accessDeleted = new EventEmitter<string>();
  @Output() accessToUpdate = new EventEmitter<string>();

  public baseUrl = window.location.origin;
  public dataSource: MatTableDataSource<Access>;
  public displayedColumns = [];

  public constructor(
    private clipboard: Clipboard,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {
    addIcons({
      copyOutline,
      createOutline,
      ellipsisHorizontal,
      linkOutline,
      lockClosedOutline,
      lockOpenOutline,
      removeCircleOutline
    });
  }

  public ngOnChanges() {
    this.displayedColumns = ['alias', 'grantee', 'type', 'details'];

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    if (this.accesses) {
      this.dataSource = new MatTableDataSource(this.accesses);
    }
  }

  public getPublicUrl(aId: string): string {
    const languageCode = this.user.settings.language;

    return `${this.baseUrl}/${languageCode}/${publicRoutes.public.path}/${aId}`;
  }

  public onCopyUrlToClipboard(aId: string): void {
    this.clipboard.copy(this.getPublicUrl(aId));

    this.snackBar.open(
      '✅ ' + $localize`Link has been copied to the clipboard`,
      undefined,
      {
        duration: ms('3 seconds')
      }
    );
  }

  public onDeleteAccess(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.accessDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to revoke this granted access?`
    });
  }

  public onUpdateAccess(aId: string) {
    this.accessToUpdate.emit(aId);
  }
}
