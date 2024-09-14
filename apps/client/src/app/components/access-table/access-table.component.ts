import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { Access } from '@ghostfolio/common/interfaces';

import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'gf-access-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss']
})
export class AccessTableComponent implements OnChanges, OnInit {
  @Input() accesses: Access[];
  @Input() showActions: boolean;

  @Output() accessDeleted = new EventEmitter<string>();

  public baseUrl = window.location.origin;
  public dataSource: MatTableDataSource<Access>;
  public defaultLanguageCode = DEFAULT_LANGUAGE_CODE;
  public displayedColumns = [];

  public constructor(
    private clipboard: Clipboard,
    private notificationService: NotificationService
  ) {}

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = ['alias', 'grantee', 'type', 'details'];

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    if (this.accesses) {
      this.dataSource = new MatTableDataSource(this.accesses);
    }
  }

  public copyToClipBoard(aId: string): void {
    this.clipboard.copy(`${this.baseUrl}/${this.defaultLanguageCode}/p/${aId}`);
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
