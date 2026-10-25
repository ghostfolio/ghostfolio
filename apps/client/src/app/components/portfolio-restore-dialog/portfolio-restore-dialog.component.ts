import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreatePlatformDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

interface Backup {
  accounts?: CreateAccountWithBalancesDto[];
  activities: CreateOrderDto[];
  assetProfiles?: CreateAssetProfileWithMarketDataDto[];
  platforms?: CreatePlatformDto[];
  tags?: CreateTagDto[];
  user?: {
    settings?: { currency?: string; performanceCalculationType?: string };
  };
}
interface RestorePreview {
  digest: string;
  accounts: {
    sourceId: string;
    name: string;
    currency: string;
    targetId: string | null;
    action: string;
    cashEvents: number;
    cashBalance: string | null;
  }[];
  destinationAccounts: { id: string; name: string; currency: string }[];
  activities: number;
  newActivities: number;
  duplicates: number;
  cashEvents: number;
  errors: string[];
  warnings: string[];
}

@Component({
  selector: 'gf-portfolio-restore-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  template: `
    <h2 i18n mat-dialog-title>Import Data</h2>
    <mat-dialog-content>
      <p i18n>
        Restore a JSON file created with Export Data. Accounts, financial
        activities and account cash are restored together. Your login
        credentials are not imported.
      </p>
      <p i18n>
        For CSV files, use Import Activities or Import CSV in the account's Cash
        Balances.
      </p>
      <input
        accept=".json,application/json"
        aria-label="Select a Ghostfolio JSON backup"
        type="file"
        [disabled]="busy()"
        (change)="readFile($event)"
      />
      @if (backup(); as data) {
        <p class="mt-3">{{ fileName() }}</p>
        <p i18n>
          Choose a destination for each source account. Accounts are never
          matched automatically by name.
        </p>
        @for (account of data.accounts ?? []; track account.id) {
          <mat-form-field
            appearance="outline"
            class="w-100"
            floatLabel="always"
          >
            <mat-label
              >{{ account.name }} ·
              {{ account.currency || unspecifiedCurrency }}</mat-label
            >
            <mat-select
              [disabled]="busy()"
              [ngModel]="choices[account.id!]"
              (ngModelChange)="choose(account.id!, $event)"
            >
              <mat-option i18n value="NEW">Create a new account</mat-option>
              <mat-option i18n value="SKIP">Exclude this account</mat-option>
              @for (target of destinations(); track target.id) {
                <mat-option [value]="target.id"
                  >{{ target.name }} ·
                  {{ target.currency || unspecifiedCurrency }}</mat-option
                >
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-checkbox
          i18n
          [disabled]="busy()"
          [ngModel]="restoreSettings"
          (ngModelChange)="restoreSettings = $event; preview.set(null)"
          >Restore base currency and performance method when the destination
          portfolio is empty</mat-checkbox
        >
        <p class="small" i18n>
          Existing data is retained. Restore cash into a new or empty account,
          or an account whose activities match the backup and has no cash
          ledger. Transfers require both accounts. Nothing is saved during
          preview.
        </p>
        <button
          i18n
          mat-stroked-button
          [disabled]="busy()"
          (click)="loadPreview()"
        >
          Preview import
        </button>
      }
      @if (error()) {
        <p class="text-danger mt-3" role="alert">{{ error() }}</p>
      }
      @if (preview(); as plan) {
        <section aria-live="polite" class="mt-3">
          <h3 i18n>Import summary</h3>
          @for (account of plan.accounts; track account.sourceId) {
            <p>
              {{ account.name }} ·
              {{ account.currency || unspecifiedCurrency }} —
              @if (account.action === 'NEW') {
                <span i18n>New account</span>
              } @else {
                <span i18n>Existing account</span>
              }
            </p>
          }
          @for (account of plan.accounts; track account.sourceId) {
            @if (account.cashBalance !== null) {
              <p>
                {{ account.name }} — <span i18n>Cash balance:</span>
                {{ account.cashBalance }}
                {{ account.currency || unspecifiedCurrency }}
              </p>
            }
          }
          <p>
            <span i18n>New activities:</span> {{ plan.newActivities }} ·
            <span i18n>Already present:</span> {{ plan.duplicates }} ·
            <span i18n>Cash movements:</span> {{ plan.cashEvents }}
          </p>
          @for (warning of plan.warnings; track warning) {
            <p class="text-body-secondary">{{ warning }}</p>
          }
          @for (message of plan.errors; track message) {
            <p class="text-danger" role="alert">{{ message }}</p>
          }
          <p i18n>
            Confirm only after checking the selected accounts. All accepted data
            is saved together; an error cancels the whole restore.
          </p>
        </section>
      }
      @if (busy()) {
        <p i18n role="status">Processing data…</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button i18n mat-button [disabled]="busy()" (click)="close()">
        Cancel
      </button>
      <button
        i18n
        mat-flat-button
        [disabled]="busy() || !preview() || !!preview()?.errors?.length"
        (click)="restore()"
      >
        Import Data
      </button>
    </mat-dialog-actions>
  `
})
export class GfPortfolioRestoreDialogComponent {
  protected readonly backup = signal<Backup | null>(null);
  protected readonly preview = signal<RestorePreview | null>(null);
  protected readonly destinations = signal<
    RestorePreview['destinationAccounts']
  >([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fileName = signal('');
  protected choices: Record<string, string> = {};
  protected restoreSettings = true;
  protected readonly unspecifiedCurrency = $localize`Currency not set`;
  private readonly initial = inject<{ backup?: Backup; fileName?: string }>(
    MAT_DIALOG_DATA,
    { optional: true }
  );

  private readonly http = inject(HttpClient);
  private readonly dialog = inject(
    MatDialogRef<GfPortfolioRestoreDialogComponent>
  );
  private readonly user = inject(UserService);

  public ngOnInit() {
    if (this.initial?.backup) {
      this.backup.set(this.initial.backup);
      this.fileName.set(this.initial.fileName ?? '');
      for (const account of this.initial.backup.accounts ?? [])
        if (account.id) this.choices[account.id] = 'NEW';
      void this.loadPreview();
    }
  }

  protected choose(id: string, targetId: string) {
    this.choices[id] = targetId;
    this.preview.set(null);
  }
  protected close() {
    this.dialog.close();
  }
  protected async readFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.preview.set(null);
    this.backup.set(null);
    this.choices = {};
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error($localize`The JSON backup must not exceed 10 MB.`);
      const data = JSON.parse(
        (await file.text()).replace(/^\uFEFF/, '')
      ) as Backup;
      if (
        !Array.isArray(data.activities) ||
        (data.accounts !== undefined && !Array.isArray(data.accounts))
      )
        throw new Error($localize`Choose a Ghostfolio Export Data JSON file.`);
      this.backup.set(data);
      this.fileName.set(file.name);
      for (const account of data.accounts ?? [])
        if (account.id) this.choices[account.id] = 'NEW';
      await this.loadPreview();
    } catch (error) {
      this.showError(error);
    }
  }
  protected async loadPreview() {
    this.busy.set(true);
    this.error.set('');
    this.preview.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<RestorePreview>(
          '/api/v1/import/restore/preview',
          this.payload()
        )
      );
      this.destinations.set(result.destinationAccounts);
      this.preview.set(result);
    } catch (error) {
      this.showError(error);
    } finally {
      this.busy.set(false);
    }
  }
  protected async restore() {
    const plan = this.preview();
    if (!plan || plan.errors.length || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post('/api/v1/import/restore', {
          ...this.payload(),
          digest: plan.digest
        })
      );
      // The financial write already committed. A refresh failure must not
      // turn it into a retryable import failure.
      await firstValueFrom(this.user.get(true)).catch(() => undefined);
      this.dialog.close(true);
    } catch (error) {
      this.preview.set(null);
      this.showError(error);
    } finally {
      this.busy.set(false);
    }
  }
  private payload() {
    return {
      backup: this.backup(),
      choices: Object.entries(this.choices).map(([sourceId, targetId]) => ({
        sourceId,
        targetId
      })),
      restoreSettings: this.restoreSettings
    };
  }

  private showError(error: unknown) {
    const message =
      error instanceof HttpErrorResponse
        ? error.error?.message
        : error instanceof Error
          ? error.message
          : $localize`Import failed. Preview the file again.`;
    this.error.set(
      Array.isArray(message) ? message.join(' ') : String(message)
    );
  }
}
