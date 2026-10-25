import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CashCsvPreview } from '@ghostfolio/common/interfaces';

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
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'gf-account-csv-import-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  styles: [
    `
      .cash-csv-table-container {
        overflow-x: auto;
      }
      .cash-csv-preview {
        width: 100%;
        min-width: 36rem;
        border-collapse: collapse;
      }
      .cash-csv-preview th,
      .cash-csv-preview td {
        padding: 0.75rem;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid rgba(127, 127, 127, 0.3);
      }
      .cash-csv-preview th {
        white-space: nowrap;
      }
      .cash-csv-preview td:nth-child(-n + 3) {
        white-space: nowrap;
      }
      .cash-csv-preview th:nth-child(3),
      .cash-csv-preview td:nth-child(3) {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .cash-csv-preview td:last-child {
        min-width: 14rem;
        overflow-wrap: anywhere;
      }
      .cash-csv-preview mat-form-field {
        width: 100%;
      }
    `
  ],
  template: `
    <h2 i18n mat-dialog-title>Import cash CSV</h2>
    <mat-dialog-content>
      <p i18n>
        Import a cash journal into an existing account or create a new account
        from the CSV. Financial activities are not created by this importer. Use
        Import Data JSON to move an entire portfolio.
      </p>
      <input
        accept=".csv,text/csv"
        aria-label="Select a cash CSV file"
        type="file"
        [disabled]="busy()"
        (change)="readFile($event)"
      />
      @if (csv()) {
        <p class="mt-3">{{ fileName() }} · {{ currency() }}</p>
        <mat-form-field appearance="outline" class="w-100" floatLabel="always">
          <mat-label i18n>Destination account</mat-label>
          <mat-select
            [disabled]="busy()"
            [ngModel]="target"
            (ngModelChange)="target = $event; invalidate()"
          >
            <mat-option i18n value="NEW">Create a new account</mat-option>
            @for (account of data.accounts; track account.id) {
              <mat-option [value]="account.id"
                >{{ account.name }} · {{ account.currency }}</mat-option
              >
            }
          </mat-select>
        </mat-form-field>
        @if (target === 'NEW') {
          <mat-form-field appearance="outline" class="w-100" floatLabel="always"
            ><mat-label i18n>New account name</mat-label
            ><input
              matInput
              maxlength="200"
              [disabled]="busy()"
              [ngModel]="name"
              (ngModelChange)="name = $event; invalidate()"
          /></mat-form-field>
          <p class="small" i18n>
            The name and currency are proposed from the CSV. No account is
            created until you confirm a valid preview. If the file references
            financial activities, import those into an existing account first or
            use the full JSON restore.
          </p>
        }
        <button
          i18n
          mat-stroked-button
          [disabled]="busy() || (target === 'NEW' && !name.trim())"
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
          <h3 i18n>Cash CSV preview</h3>
          <p>
            <span i18n>Destination:</span> {{ destinationName() }} ·
            {{ plan.currency }}
          </p>
          <p>
            <span i18n>New movements:</span> {{ plan.newCount }} ·
            <span i18n>Already present:</span> {{ plan.existingCount }}
          </p>
          <p>
            <span i18n>Expected cash balance:</span> {{ plan.finalBalance }}
            {{ plan.currency }}
          </p>
          @for (warning of plan.warnings; track warning) {
            <p class="text-body-secondary">{{ warning }}</p>
          }
          @for (message of plan.errors.slice(0, 20); track $index) {
            <p class="text-danger" role="alert">{{ message }}</p>
          }
          @if (plan.errors.length > 20) {
            <p i18n>
              Further errors are listed beside the affected rows below.
            </p>
          }
          <div class="cash-csv-table-container">
            <table class="cash-csv-preview">
              <thead>
                <tr>
                  <th i18n>Date</th>
                  <th i18n>Operation</th>
                  <th i18n>Amount</th>
                  <th i18n>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (
                  row of plan.rows.slice(page() * 100, (page() + 1) * 100);
                  track row.line
                ) {
                  <tr>
                    <td>{{ row.date }}</td>
                    <td>{{ row.operation }}</td>
                    <td>{{ row.amount }}</td>
                    <td>
                      {{ row.status }} {{ row.message }}
                      @if (row.candidates?.length) {
                        <mat-form-field appearance="outline" floatLabel="always"
                          ><mat-label i18n>Linked activity</mat-label
                          ><mat-select
                            [disabled]="busy()"
                            [ngModel]="links[row.line]"
                            (ngModelChange)="resolve(row.line, $event)"
                          >
                            @for (
                              candidate of row.candidates;
                              track candidate.id
                            ) {
                              <mat-option [value]="candidate.id">{{
                                candidate.label
                              }}</mat-option>
                            }
                          </mat-select></mat-form-field
                        >
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (plan.rows.length > 100) {
            <button
              i18n
              mat-button
              [disabled]="page() === 0 || busy()"
              (click)="page.set(page() - 1)"
            >
              Previous
            </button>
            <span
              >{{ page() * 100 + 1 }}–{{
                Math.min((page() + 1) * 100, plan.rows.length)
              }}
              / {{ plan.rows.length }}</span
            >
            <button
              i18n
              mat-button
              [disabled]="(page() + 1) * 100 >= plan.rows.length || busy()"
              (click)="page.set(page() + 1)"
            >
              Next
            </button>
          }
          @if (+plan.minimumBalance < 0) {
            <mat-checkbox i18n [disabled]="busy()" [(ngModel)]="confirmNegative"
              >I confirm the negative cash balance shown in the
              preview</mat-checkbox
            >
          }
        </section>
      }
      @if (busy()) {
        <p i18n role="status">Processing data…</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button i18n mat-button [disabled]="busy()" (click)="dialog.close()">
        Cancel
      </button>
      <button
        i18n
        mat-flat-button
        [disabled]="
          busy() ||
          !preview() ||
          !!preview()?.errors?.length ||
          (+preview()!.minimumBalance < 0 && !confirmNegative)
        "
        (click)="confirm()"
      >
        Import CSV
      </button>
    </mat-dialog-actions>
  `
})
export class GfAccountCsvImportDialogComponent {
  protected readonly data = inject<{
    accounts: { id: string; name: string; currency: string }[];
  }>(MAT_DIALOG_DATA);
  protected readonly dialog = inject(
    MatDialogRef<GfAccountCsvImportDialogComponent>
  );
  protected readonly csv = signal('');
  protected readonly fileName = signal('');
  protected readonly currency = signal('');
  protected readonly preview = signal<CashCsvPreview | null>(null);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly page = signal(0);
  protected readonly Math = Math;
  protected target = 'NEW';
  protected name = '';
  protected links: Record<string, string> = {};
  protected confirmNegative = false;
  private newId = crypto.randomUUID();
  private readonly http = inject(HttpClient);
  private readonly user = inject(UserService);

  protected invalidate() {
    this.preview.set(null);
    this.links = {};
    this.confirmNegative = false;
    this.page.set(0);
    this.error.set('');
  }
  protected destinationName() {
    return this.target === 'NEW'
      ? this.name
      : this.data.accounts.find((a) => a.id === this.target)?.name;
  }
  protected async readFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    this.invalidate();
    this.csv.set('');
    this.busy.set(true);
    this.newId = crypto.randomUUID();
    this.target = 'NEW';
    try {
      if (file.size > 2000000)
        throw Error($localize`Cash CSV exceeds the 2 MB limit.`);
      const csv = await file.text();
      const metadata = await firstValueFrom(
        this.http.post<{ name: string; currency: string }>(
          '/api/v1/account/cash-csv/inspect',
          { csv }
        )
      );
      this.name = metadata.name || $localize`Imported cash account`;
      this.currency.set(metadata.currency);
      this.csv.set(csv);
      this.fileName.set(file.name);
    } catch (error) {
      this.showError(error);
    } finally {
      this.busy.set(false);
    }
  }
  protected async resolve(line: number, id: string) {
    this.links = { ...this.links, [line]: id };
    await this.loadPreview();
  }
  protected async loadPreview() {
    if (this.busy() || !this.csv()) return;
    this.busy.set(true);
    this.error.set('');
    this.preview.set(null);
    this.confirmNegative = false;
    try {
      const result =
        this.target === 'NEW'
          ? await firstValueFrom(
              this.http.post<CashCsvPreview>(
                '/api/v1/account/cash-csv/new/preview',
                this.newPayload()
              )
            )
          : await firstValueFrom(
              this.http.post<CashCsvPreview>(
                `/api/v1/account/${this.target}/cash/import/preview`,
                { csv: this.csv(), activityLinks: this.links }
              )
            );
      this.preview.set(result);
    } catch (error) {
      this.showError(error);
    } finally {
      this.busy.set(false);
    }
  }
  protected async confirm() {
    const plan = this.preview();
    if (
      !plan ||
      plan.errors.length ||
      this.busy() ||
      (+plan.minimumBalance < 0 && !this.confirmNegative)
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.target === 'NEW')
        await firstValueFrom(
          this.http.post('/api/v1/account/cash-csv/new/import', {
            ...this.newPayload(),
            digest: plan.digest,
            confirmNegativeBalance: this.confirmNegative
          })
        );
      else
        await firstValueFrom(
          this.http.post(`/api/v1/account/${this.target}/cash/import`, {
            csv: this.csv(),
            activityLinks: this.links,
            expectedRevision: plan.revision,
            digest: plan.digest,
            confirmNegativeBalance: this.confirmNegative
          })
        );
      await firstValueFrom(this.user.get(true)).catch(() => undefined);
      this.dialog.close(true);
    } catch (error) {
      this.preview.set(null);
      this.showError(error);
    } finally {
      this.busy.set(false);
    }
  }
  private newPayload() {
    return {
      accountId: this.newId,
      name: this.name.trim(),
      currency: this.currency(),
      csv: this.csv()
    };
  }
  private showError(error: unknown) {
    const payload: unknown =
      error instanceof HttpErrorResponse ? error.error : undefined;
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message
        : error instanceof Error
          ? error.message
          : undefined;
    this.error.set(
      Array.isArray(message)
        ? message.join(' ')
        : typeof message === 'string'
          ? message
          : $localize`Unable to import the cash CSV.`
    );
  }
}
