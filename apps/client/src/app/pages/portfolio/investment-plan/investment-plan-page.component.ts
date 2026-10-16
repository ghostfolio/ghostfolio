import { LookupItem } from '@ghostfolio/common/interfaces';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, of } from 'rxjs';

interface AllocationRow {
  groupId: string;
  name?: string;
  rebalanceThreshold: number;
  symbol: string;
  targetWeight: number;
}

interface AllocationGroup {
  groupId: string;
  name: string;
  rebalanceThreshold: number;
  symbols: string[];
  targetWeight: number;
}

interface DcaSchedule {
  deadlineDay: number;
  endDate?: string;
  id?: string;
  signalType: string;
  startDate: string;
  symbol: string;
  totalBudget?: number;
  type: string;
  weeklyBudget: number;
}

interface PriceAlert {
  condition: string;
  dataSource: string;
  id?: string;
  isActive?: boolean;
  messageTemplate: string;
  name?: string;
  symbol: string;
  targetValue: number;
  triggeredAt?: string | null;
  triggeredValue?: number | null;
}

export type InvestmentPlanTab = 'settings' | 'rebalancing' | 'dca' | 'signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolAutocompleteComponent,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    ReactiveFormsModule
  ],
  selector: 'gf-investment-plan-page',
  styleUrls: ['./investment-plan-page.component.scss'],
  templateUrl: './investment-plan-page.component.html'
})
export class GfInvestmentPlanPageComponent implements OnInit {
  public activeTab: InvestmentPlanTab = 'rebalancing';
  public allocationSymbolControls: FormControl<LookupItem | null>[] = [
    new FormControl<LookupItem | null>(null)
  ];
  public allocationGroups: AllocationGroup[] = [];
  public dcaSchedules: DcaSchedule[] = [];
  public dcaSymbolControl = new FormControl<LookupItem | null>(null);
  public emailEnabled = false;
  public isLoading = true;
  public newAllocation: {
    name: string;
    rebalanceThreshold: number;
    targetWeight: number;
  } = {
    name: '',
    rebalanceThreshold: 5,
    targetWeight: 0
  };
  public newDca: Omit<DcaSchedule, 'symbol'> = {
    deadlineDay: 5,
    signalType: 'MA5',
    startDate: new Date().toISOString().split('T')[0],
    type: 'ADD_POSITION',
    weeklyBudget: 200
  };
  public priceAlertSymbolControl = new FormControl<LookupItem | null>(null);
  public priceAlerts: PriceAlert[] = [];
  public newPriceAlert: Omit<PriceAlert, 'dataSource' | 'name' | 'symbol'> = {
    condition: 'LESS_THAN_OR_EQUAL',
    messageTemplate: '',
    targetValue: 0
  };
  public plan: {
    capitalPool: number;
    cashBuffer: number;
    cashReserve: number;
    deployedCapital: number;
    longTermGrowthTarget: number;
    notifyEmail: string;
    notifyLanguage: string;
    preservationBucket: number;
    sipMonthlyBudget: number;
    subscribeDca: boolean;
    subscribePriceAlert: boolean;
    subscribeRebalancing: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
  } = {
    capitalPool: 0,
    cashBuffer: 0,
    cashReserve: 0,
    deployedCapital: 0,
    longTermGrowthTarget: 0,
    notifyEmail: '',
    notifyLanguage: 'en',
    preservationBucket: 0,
    sipMonthlyBudget: 0,
    subscribeDca: true,
    subscribePriceAlert: true,
    subscribeRebalancing: true,
    webhookEnabled: false,
    webhookUrl: ''
  };
  public rebalancingResult: {
    actions: any[];
    capital?: { gap: number; reason: string; status: string };
    hasTriggered: boolean;
    totalValue: number;
  } | null = null;
  public signals: any[] = [];
  public totalAllocationWeight = 0;

  public isSaving = false;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dataService: DataService,
    private readonly destroyRef: DestroyRef,
    private readonly snackBar: MatSnackBar
  ) {}

  public ngOnInit() {
    this.loadPlan();
    this.loadSignals();
    this.loadRebalancing();
  }

  public setTab(tab: InvestmentPlanTab) {
    this.activeTab = tab;
    this.changeDetectorRef.markForCheck();
  }

  public onSavePlan() {
    this.isSaving = true;
    this.changeDetectorRef.markForCheck();
    this.dataService
      .putInvestmentPlan({ ...this.plan, emailEnabled: this.emailEnabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.loadPlan();
          this.snackBar.open('Settings saved', undefined, { duration: 3000 });
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.snackBar.open('Failed to save settings', undefined, { duration: 3000 });
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public addAllocationSymbolRow() {
    this.allocationSymbolControls.push(new FormControl<LookupItem | null>(null));
  }

  public removeAllocationSymbolRow(index: number) {
    if (this.allocationSymbolControls.length <= 1) return;
    this.allocationSymbolControls.splice(index, 1);
  }

  public onAddAllocation() {
    const symbols = this.allocationSymbolControls
      .map((control) => control.value)
      .filter((item): item is LookupItem => !!item?.symbol)
      .map((item) => ({ name: item.name, symbol: item.symbol }));
    if (!symbols.length || this.newAllocation.targetWeight <= 0) return;
    this.dataService
      .putInvestmentPlanAllocationGroup({
        name: this.newAllocation.name || undefined,
        rebalanceThreshold: this.newAllocation.rebalanceThreshold,
        symbols,
        targetWeight: this.newAllocation.targetWeight
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allocationSymbolControls = [new FormControl<LookupItem | null>(null)];
        this.newAllocation = { name: '', rebalanceThreshold: 5, targetWeight: 0 };
        this.loadPlan();
        this.loadRebalancing();
      });
  }

  public onDeleteAllocation(groupId: string) {
    this.dataService
      .deleteInvestmentPlanAllocationGroup(groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadPlan();
        this.loadRebalancing();
      });
  }

  public onAddDca() {
    const symbol = this.dcaSymbolControl.value?.symbol;
    if (!symbol || this.newDca.weeklyBudget <= 0) return;
    this.dataService
      .postInvestmentPlanDca({ ...this.newDca, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dcaSymbolControl.reset();
        this.newDca = {
          deadlineDay: 5,
          signalType: 'MA5',
          startDate: new Date().toISOString().split('T')[0],
          type: 'ADD_POSITION',
          weeklyBudget: 200
        };
        this.loadPlan();
      });
  }

  public onDeleteDca(id: string) {
    this.dataService
      .deleteInvestmentPlanDca(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPlan());
  }

  public onAddPriceAlert() {
    const item = this.priceAlertSymbolControl.value;
    if (!item?.symbol || !item?.dataSource || this.newPriceAlert.targetValue <= 0) {
      return;
    }
    this.dataService
      .postInvestmentPlanPriceAlert({
        ...this.newPriceAlert,
        dataSource: item.dataSource,
        name: item.name,
        symbol: item.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.priceAlertSymbolControl.reset();
        this.newPriceAlert = {
          condition: 'LESS_THAN_OR_EQUAL',
          messageTemplate: '',
          targetValue: 0
        };
        this.loadPlan();
      });
  }

  public onDeletePriceAlert(id: string) {
    this.dataService
      .deleteInvestmentPlanPriceAlert(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPlan());
  }

  public onRearmPriceAlert(id: string) {
    this.dataService
      .rearmInvestmentPlanPriceAlert(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPlan());
  }

  public insertPriceAlertVariable(
    textarea: HTMLTextAreaElement,
    variable: 'symbol' | 'targetValue' | 'currentValue'
  ) {
    const token = `{${variable}}`;
    const start = textarea.selectionStart ?? this.newPriceAlert.messageTemplate.length;
    const end = textarea.selectionEnd ?? start;
    const current = this.newPriceAlert.messageTemplate;
    this.newPriceAlert = {
      ...this.newPriceAlert,
      messageTemplate: current.slice(0, start) + token + current.slice(end)
    };
    this.changeDetectorRef.markForCheck();
    setTimeout(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  public conditionLabel(condition: string): string {
    const map: Record<string, string> = {
      GREATER_THAN: '>',
      GREATER_THAN_OR_EQUAL: '≥',
      LESS_THAN: '<',
      LESS_THAN_OR_EQUAL: '≤'
    };
    return map[condition] ?? condition;
  }

  public onDismissSignal(id: string) {
    this.dataService
      .putInvestmentSignalStatus(id, 'DISMISSED')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSignals());
  }

  public onExecuteSignal(id: string) {
    this.dataService
      .putInvestmentSignalStatus(id, 'EXECUTED')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSignals());
  }

  public prefillDcaFromRebalance(action: any) {
    const total = Math.round(action.amount);
    const weekly = Math.max(50, Math.round(total / 7 / 50) * 50);
    this.newDca = { ...this.newDca, totalBudget: total, weeklyBudget: weekly };
    this.setTab('dca');
  }

  public signalTypeLabel(type: string): string {
    const map: Record<string, string> = {
      DCA_BUY: 'DCA Buy',
      DCA_WAIT: 'DCA Wait',
      REBALANCE_BUY: 'Rebalance Buy',
      REBALANCE_SELL: 'Rebalance Sell'
    };
    return map[type] ?? type;
  }

  private groupAllocations(rows: AllocationRow[]): AllocationGroup[] {
    const groups = new Map<string, AllocationGroup>();
    for (const row of rows) {
      const group = groups.get(row.groupId);
      if (group) {
        group.symbols.push(row.symbol);
      } else {
        groups.set(row.groupId, {
          groupId: row.groupId,
          name: row.name?.length ? row.name : row.symbol,
          rebalanceThreshold: row.rebalanceThreshold,
          symbols: [row.symbol],
          targetWeight: row.targetWeight
        });
      }
    }
    return Array.from(groups.values());
  }

  private loadPlan() {
    this.isLoading = true;
    this.dataService
      .fetchInvestmentPlan()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((plan) => {
        if (plan) {
          this.plan = {
            capitalPool: plan.capitalPool,
            cashBuffer: plan.cashBuffer ?? 0,
            cashReserve: plan.cashReserve ?? 0,
            deployedCapital: plan.deployedCapital,
            longTermGrowthTarget: plan.longTermGrowthTarget ?? 0,
            notifyEmail: plan.notifyEmail ?? '',
            notifyLanguage: plan.notifyLanguage,
            preservationBucket: plan.preservationBucket ?? 0,
            sipMonthlyBudget: plan.sipMonthlyBudget ?? 0,
            subscribeDca: plan.subscribeDca ?? true,
            subscribePriceAlert: plan.subscribePriceAlert ?? true,
            subscribeRebalancing: plan.subscribeRebalancing ?? true,
            webhookEnabled: plan.webhookEnabled ?? false,
            webhookUrl: plan.webhookUrl ?? ''
          };
          this.emailEnabled = plan.emailEnabled;
          this.allocationGroups = this.groupAllocations(plan.allocations ?? []);
          this.dcaSchedules = plan.dcaSchedules ?? [];
          this.priceAlerts = plan.priceAlerts ?? [];
          this.totalAllocationWeight = this.allocationGroups.reduce(
            (s: number, g: AllocationGroup) => s + g.targetWeight,
            0
          );
        }
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  private loadSignals() {
    this.dataService
      .fetchInvestmentSignals()
      .pipe(
        catchError(() => of({ signals: [] })),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ signals }) => {
        this.signals = signals;
        this.changeDetectorRef.markForCheck();
      });
  }

  private loadRebalancing() {
    this.dataService
      .fetchRebalancing()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.rebalancingResult = result;
        this.changeDetectorRef.markForCheck();
      });
  }
}
