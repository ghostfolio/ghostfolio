import { COMMENT_MAXIMUM_LENGTH } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  CashCsvPreview,
  CashEventInput,
  CashManagementSnapshot,
  ManagedCashEvent
} from '@ghostfolio/common/interfaces';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Big } from 'big.js';
import { format } from 'date-fns';
import { addIcons } from 'ionicons';
import { ellipsisVertical } from 'ionicons/icons';
import { finalize, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'gf-cash-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    IonIcon
  ],
  templateUrl: './cash-management.component.html',
  styleUrls: ['./cash-management.component.scss']
})
export class GfCashManagementComponent {
  public readonly accountId = input.required<string>();
  public readonly accountName = input<string | null>();
  public readonly currentBalance = input<number>(0);
  public readonly eventId = input<string>();
  public readonly currency = input<string | null>();
  public readonly canWrite = input(false);
  public readonly changed = output<void>();

  protected readonly COMMENT_MAXIMUM_LENGTH = COMMENT_MAXIMUM_LENGTH;
  protected readonly cashGuideLink =
    publicRoutes.resources.subRoutes.guides.routerLink;
  protected readonly today = format(new Date(), DATE_FORMAT);
  protected readonly snapshot = signal<
    CashManagementSnapshot | null | undefined
  >(undefined);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly transferInformation = signal<ManagedCashEvent | null>(
    null
  );
  protected readonly csvPage = signal(0);
  protected readonly unnamedAccount = $localize`Selected account`;
  protected readonly csvPreview = signal<CashCsvPreview | null>(null);
  protected readonly selectedFile = signal('');
  protected readonly editing = signal<string | undefined>(undefined);
  protected readonly orderedEvents = () =>
    [...(this.snapshot()?.events ?? [])].reverse();
  protected readonly form = new FormGroup({
    operation: new FormControl('DEPOSIT', { nonNullable: true }),
    date: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    amount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]
    }),
    fee: new FormControl('0', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]
    }),
    comment: new FormControl('', { nonNullable: true })
  });
  private readonly accountRequestsCancelled = new Subject<void>();
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formDirective = viewChild(FormGroupDirective);
  private readonly router = inject(Router);
  private csvContent = '';
  private csvActivityLinks: Record<string, string> = {};

  public constructor() {
    addIcons({ ellipsisVertical });
    this.form.controls.operation.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((operation) => {
        if (operation === 'CHECKPOINT') this.form.controls.fee.setValue('0');
      });
    effect((onCleanup) => {
      const accountId = this.accountId();

      this.transferInformation.set(null);
      this.snapshot.set(undefined);
      this.error.set('');

      const subscription = this.dataService
        .fetchCashManagement(accountId)
        .subscribe({
          next: (snapshot) => {
            this.snapshot.set(snapshot);
            const event = snapshot?.events.find(
              ({ id }) => id === this.eventId()
            );
            if (event && !event.orderId && !event.transferId) this.edit(event);
          },
          error: () =>
            this.error.set($localize`Unable to load cash transactions.`)
        });

      onCleanup(() => {
        subscription.unsubscribe();
        this.accountRequestsCancelled.next();
      });
    });
  }

  protected save() {
    const state = this.snapshot();
    if (!state || this.form.invalid || this.busy()) {
      return;
    }
    const { operation, amount, date, comment, fee } = this.form.getRawValue();
    const value = new Big(amount);
    if (operation !== 'CHECKPOINT' && !value.gt(0)) {
      this.error.set($localize`Enter a positive amount.`);
      return;
    }
    const event: CashEventInput =
      operation === 'CHECKPOINT'
        ? {
            type: 'CHECKPOINT',
            balance: value.toString(),
            date,
            comment,
            fee: '0'
          }
        : {
            type: 'MOVEMENT',
            fee,
            amount: (operation === 'WITHDRAWAL'
              ? value.neg()
              : value
            ).toString(),
            date,
            comment
          };
    this.run(
      this.dataService.saveCashEvent(
        this.accountId(),
        event,
        state.revision,
        this.editing()
      )
    );
  }

  protected edit(event: ManagedCashEvent) {
    this.editing.set(event.id);
    const value =
      event.type === 'CHECKPOINT'
        ? new Big(event.balance)
        : new Big(event.amount);
    this.form.setValue({
      operation:
        event.type === 'CHECKPOINT'
          ? 'CHECKPOINT'
          : value.lt(0)
            ? 'WITHDRAWAL'
            : 'DEPOSIT',
      date: event.date,
      amount: (event.type === 'CHECKPOINT' ? value : value.abs()).toFixed(),
      fee: event.fee ?? '0',
      comment: event.comment ?? ''
    });
  }

  protected cancelEdit() {
    this.editing.set(undefined);
    this.formDirective()?.resetForm({
      operation: 'DEPOSIT',
      date: this.today,
      amount: '',
      fee: '0',
      comment: ''
    });
  }

  protected remove(event: ManagedCashEvent) {
    const state = this.snapshot();
    if (state && !this.busy()) {
      this.run(
        this.dataService.deleteCashEvent(
          this.accountId(),
          event.id,
          state.revision
        )
      );
    }
  }

  protected preferences(change: {
    defaultUpdateCash?: boolean;
    includeCashInPortfolio?: boolean;
  }) {
    const state = this.snapshot();
    if (state && !this.busy()) {
      this.run(
        this.dataService.updateCashPreferences(
          this.accountId(),
          state.revision,
          change.defaultUpdateCash,
          change.includeCashInPortfolio
        )
      );
    }
  }

  protected eventLabel(event: ManagedCashEvent) {
    if (event.orderId) {
      return $localize`Activity`;
    }
    if (event.transferId) {
      return $localize`Transfer`;
    }
    if (event.type === 'CHECKPOINT') {
      return $localize`Reconciliation`;
    }
    return new Big(event.amount).lt(0)
      ? $localize`Withdrawal`
      : $localize`Deposit`;
  }

  protected openSource(event: ManagedCashEvent) {
    if (event.orderId) {
      void this.router.navigate(
        internalRoutes.portfolio.subRoutes.activities.subRoutes.update.routerLink(
          event.orderId
        )
      );
    } else {
      this.transferInformation.set(event);
    }
  }

  protected balanceAfter(event: ManagedCashEvent) {
    const state = this.snapshot();
    let balance = new Big(state?.openingBalance.balance ?? 0);
    for (const item of state?.events ?? []) {
      balance =
        item.type === 'CHECKPOINT'
          ? new Big(item.balance)
          : balance.plus(item.amount).minus(item.fee ?? 0);
      if (item.id === event.id) {
        return balance.toFixed();
      }
    }
    return balance.toFixed();
  }

  protected eventAmount(event: ManagedCashEvent) {
    return new Big(
      event.type === 'CHECKPOINT' ? event.balance : event.amount
    ).toFixed();
  }

  protected csvStatus(status: string) {
    return status === 'NEW'
      ? $localize`New`
      : status === 'EXISTING'
        ? $localize`Already present`
        : $localize`Error`;
  }

  protected exportCsv() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.dataService
      .exportCashCsv(this.accountId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false))
      )
      .subscribe({
        next: ({ csv }) => {
          const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8' })
          );
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `ghostfolio-cash-${this.accountId()}-${this.today}.csv`;
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        },
        error: (error) => this.showCsvError(error)
      });
  }

  protected async previewFile(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    this.csvPreview.set(null);
    this.csvActivityLinks = {};
    this.csvPage.set(0);
    if (!file || this.busy() || !this.canWrite()) return;
    if (file.size > 2000000) {
      this.error.set($localize`Cash CSV exceeds the 2 MB limit.`);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.selectedFile.set(file.name);
    try {
      this.csvContent = await file.text();
      this.dataService
        .previewCashCsv(
          this.accountId(),
          this.csvContent,
          this.csvActivityLinks
        )
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.busy.set(false))
        )
        .subscribe({
          next: (preview) => this.csvPreview.set(preview),
          error: (error) => this.showCsvError(error)
        });
    } catch (error) {
      this.busy.set(false);
      this.showCsvError(error);
    }
  }

  protected resolveCsvActivity(line: number, activityId: string) {
    if (this.busy()) return;
    this.csvActivityLinks = { ...this.csvActivityLinks, [line]: activityId };
    this.busy.set(true);
    this.error.set('');
    this.dataService
      .previewCashCsv(this.accountId(), this.csvContent, this.csvActivityLinks)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false))
      )
      .subscribe({
        next: (preview) => this.csvPreview.set(preview),
        error: (error) => this.showCsvError(error)
      });
  }

  protected confirmCsvImport() {
    const preview = this.csvPreview();
    if (!this.canWrite() || this.busy() || !preview || preview.errors.length)
      return;
    this.run(
      this.dataService.importCashCsv(
        this.accountId(),
        this.csvContent,
        preview,
        this.csvActivityLinks
      )
    );
  }

  protected cancelCsvImport() {
    this.csvPreview.set(null);
    this.csvContent = '';
    this.csvActivityLinks = {};
    this.selectedFile.set('');
  }

  private showCsvError(error: unknown) {
    const payload =
      error && typeof error === 'object' && 'error' in error
        ? error.error
        : undefined;
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message
        : undefined;
    this.error.set(
      Array.isArray(message) &&
        message.every((item) => typeof item === 'string')
        ? message.join('; ')
        : typeof message === 'string'
          ? message
          : $localize`Unable to process the cash CSV.`
    );
  }

  private run(request: Observable<CashManagementSnapshot>) {
    this.busy.set(true);
    this.error.set('');
    request
      .pipe(
        takeUntil(this.accountRequestsCancelled),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false))
      )
      .subscribe({
        next: (state) => {
          this.snapshot.set(state);
          this.cancelCsvImport();
          this.cancelEdit();
          this.changed.emit();
        },
        error: (error) => {
          const message = error.error?.message;
          this.error.set(
            typeof message === 'string'
              ? message
              : $localize`Unable to save. Reload the account and try again.`
          );
          // A stale revision needs a fresh snapshot and a new user decision.
          this.dataService
            .fetchCashManagement(this.accountId())
            .pipe(
              takeUntil(this.accountRequestsCancelled),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
              next: (state) => this.snapshot.set(state),
              error: () =>
                this.error.set(
                  $localize`Unable to reload cash transactions. Reload the page and try again.`
                )
            });
        }
      });
  }
}
