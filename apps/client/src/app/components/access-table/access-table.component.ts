import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { Access, User } from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import ms from 'ms';

@Component({
  selector: 'gf-access-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss'],
  standalone: false
})
export class AccessTableComponent implements OnChanges {
  @Input() accesses: Access[];
  @Input() showActions: boolean;
  @Input() user: User;

  @Output() accessDeleted = new EventEmitter<string>();

  public baseUrl = window.location.origin;
  public dataSource: MatTableDataSource<Access>;
  public displayedColumns = [];

  public constructor(
    private clipboard: Clipboard,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

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
}
