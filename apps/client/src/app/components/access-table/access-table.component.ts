import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';
import { getAccessLevel } from '@ghostfolio/common/scopes';
import { GfAccessLevelIconComponent } from '@ghostfolio/ui/access-level-icon';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output
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
  removeCircleOutline,
  trashOutline
} from 'ionicons/icons';
import ms from 'ms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    CommonModule,
    GfAccessLevelIconComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-access-table',
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss']
})
export class GfAccessTableComponent {
  public readonly accesses = input.required<Access[]>();
  public readonly isReceivedAccess = input<boolean>(false);
  public readonly showActions = input<boolean>(false);
  public readonly user = input.required<User>();

  public readonly accessDeleted = output<string>();

  protected readonly accessDialogRouterLinks = computed(() => {
    const { update } = internalRoutes.account.subRoutes.access.subRoutes;

    const routerLinks = new Map<string, string[]>();

    for (const { id } of this.accesses() ?? []) {
      routerLinks.set(id, update.routerLink(id));
    }

    return routerLinks;
  });

  protected readonly baseUrl = window.location.origin;
  protected readonly dataSource = new MatTableDataSource<Access>();

  protected readonly displayedColumns = computed(() => {
    const columns = ['alias', 'grantee', 'type', 'lastUsedAt', 'expiresAt'];

    if (this.showActions()) {
      columns.push('actions');
    }

    return columns;
  });

  protected readonly defaultDateFormat = computed(() => {
    return getDateFormatString(this.user()?.settings?.locale);
  });

  protected readonly getAccessLevel = getAccessLevel;

  protected hasPermissionToEnableMcp = false;

  protected readonly isLoading = computed(() => {
    return !this.accesses();
  });

  private readonly clipboard = inject(Clipboard);
  private readonly dataService = inject(DataService);
  private readonly notificationService = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);

  public constructor() {
    addIcons({
      copyOutline,
      createOutline,
      ellipsisHorizontal,
      removeCircleOutline,
      trashOutline
    });

    this.hasPermissionToEnableMcp = hasPermission(
      this.dataService.fetchInfo().globalPermissions,
      permissions.enableMcp
    );

    effect(() => {
      this.dataSource.data = this.accesses() ?? [];
    });
  }

  protected getPublicUrl(aId: string) {
    const languageCode = this.user().settings.language;

    return `${this.baseUrl}/${languageCode}/${publicRoutes.public.path}/${aId}`;
  }

  protected onCopyTokenToClipboard(aId: string) {
    this.clipboard.copy(aId);

    this.snackBar.open(
      '✅ ' + $localize`Token has been copied to the clipboard`,
      undefined,
      {
        duration: ms('3 seconds')
      }
    );
  }

  protected onCopyUrlToClipboard(aId: string) {
    this.clipboard.copy(this.getPublicUrl(aId));

    this.snackBar.open(
      '✅ ' + $localize`Link has been copied to the clipboard`,
      undefined,
      {
        duration: ms('3 seconds')
      }
    );
  }

  protected onDeleteAccess(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.accessDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: this.isReceivedAccess()
        ? $localize`Do you really want to remove this received access?`
        : $localize`Do you really want to revoke this granted access?`
    });
  }
}
